import assert from 'assert';
import { describe, it } from 'mocha';
import HexplorerLiveService, { HexplorerLiveClientError } from '../../hexplorer-live/HexplorerLiveService.js';
import type { HexServer } from '../../server.js';
import type AiJobService from '../../ai-jobs/AiJobService.js';
import type PositionAnalysisCache from '../../ai-jobs/PositionAnalysisCache.js';
import type PlayerRepository from '../../repositories/PlayerRepository.js';
import type HexplorerStudyRepository from '../../repositories/HexplorerStudyRepository.js';
import { Player } from '../../../shared/app/models/index.js';
import { createHexplorerState } from '../../../shared/app/hexplorerStudy.js';
import type { HexplorerLiveSnapshot } from '../../../shared/app/hexplorerLive.js';

const createPlayer = (publicId: string, isBot = false): Player => Object.assign(new Player(), { publicId, pseudo: publicId, isBot, isGuest: false });

const host = createPlayer('host');
const alice = createPlayer('alice');
const bob = createPlayer('bob');
const bot = createPlayer('bot', true);

type Emitted = { room: string, event: string, args: unknown[] };

/**
 * Records emitted events instead of sending them.
 */
const createFakeIo = (emitted: Emitted[]): HexServer => {
    const to = (room: string) => {
        const chain = {
            except: () => chain,
            get volatile() {
                return chain;
            },
            emit: (event: string, ...args: unknown[]) => {
                emitted.push({ room, event, args });
                return true;
            },
        };

        return chain;
    };

    return {
        to,
        sockets: { adapter: { rooms: new Map() }, sockets: new Map() },
    } as unknown as HexServer;
};

const createService = () => {
    const emitted: Emitted[] = [];
    const players = [host, alice, bob, bot];

    const service = new HexplorerLiveService(
        createFakeIo(emitted),
        {} as AiJobService,
        {} as PositionAnalysisCache,
        { getPlayer: (publicId: string) => Promise.resolve(players.find(p => p.publicId === publicId) ?? null) } as unknown as PlayerRepository,
        { findByPublicId: (publicId: string) => Promise.resolve({ publicId, author: host }) } as unknown as HexplorerStudyRepository,
    );

    return { service, emitted };
};

const snapshot = (currentPlayer: 0 | 1 = 0): HexplorerLiveSnapshot => ({
    state: { ...createHexplorerState(5), currentPlayer },
    scratch: null,
    analysis: null,
});

const startStream = async (service: HexplorerLiveService): Promise<string> => {
    const { publicId } = await service.create(host, 'study');
    service.setStreaming(publicId, host, true);

    return publicId;
};

const revisionOf = (service: HexplorerLiveService, publicId: string): number => service.getSession(publicId)!.revision;

const assertClientError = (fn: () => unknown, translationKey: string): void => {
    assert.throws(fn, (e: unknown) => e instanceof HexplorerLiveClientError && e.message === translationKey);
};

describe('HexplorerLiveService', () => {
    it('accepts a snapshot only if based on last revision', async () => {
        const { service } = createService();
        const publicId = await startStream(service);
        const r = revisionOf(service, publicId);

        assert.deepStrictEqual(service.updateSnapshot(publicId, host, r, snapshot(), 'socket'), { revision: r + 1 });
        assert.deepStrictEqual(service.updateSnapshot(publicId, host, r, snapshot(1), 'socket'), { rejected: true });
        assert.strictEqual(service.getSession(publicId)?.snapshot?.state.currentPlayer, 0);
        assert.deepStrictEqual(service.updateSnapshot(publicId, host, r + 1, snapshot(1), 'socket'), { revision: r + 2 });
        assert.strictEqual(revisionOf(service, publicId), r + 2);
    });

    it('starts a new session of same study after revision of previous one', async () => {
        const { service } = createService();
        const publicId = await startStream(service);

        for (let i = 0; i < 5; ++i) {
            service.updateSnapshot(publicId, host, revisionOf(service, publicId), snapshot(), 'socket');
        }

        const previousRevision = revisionOf(service, publicId);

        service.end(publicId);
        await service.create(host, 'study');

        assert.ok(revisionOf(service, publicId) > previousRevision);
    });

    it('removes cursor of an editor when its last socket left', async () => {
        const { service, emitted } = createService();
        const publicId = await startStream(service);

        await service.inviteEditor(publicId, host, 'alice');

        service.onSocketJoined(publicId, alice);
        service.onSocketJoined(publicId, alice);
        service.onSocketLeft(publicId, alice);
        assert.ok(!emitted.some(e => e.event === 'hexplorerLiveCursor'));

        service.onSocketLeft(publicId, alice);
        assert.deepStrictEqual(emitted.at(-1)?.args, [publicId, 'alice', null]);
    });

    it('lets only host and invited editors edit', async () => {
        const { service, emitted } = createService();
        const publicId = await startStream(service);

        const r = revisionOf(service, publicId);

        assertClientError(() => service.updateSnapshot(publicId, alice, r, snapshot(), 'socket'), 'hexplorer_live.errors.not_editor');
        assertClientError(() => service.updateCursor(publicId, alice, { x: 1, y: 2 }, 'socket'), 'hexplorer_live.errors.not_editor');

        await service.inviteEditor(publicId, host, 'alice');

        assert.deepStrictEqual(service.getSession(publicId)?.editors.map(p => p.publicId), ['alice']);
        assert.ok(emitted.some(e => e.room === 'players/alice' && e.event === 'hexplorerLiveInvitation'));

        assert.deepStrictEqual(service.updateSnapshot(publicId, alice, r, snapshot(), 'socket'), { revision: r + 1 });

        // Host changed analysis at same time, based on previous revision
        assert.deepStrictEqual(service.updateSnapshot(publicId, host, r, snapshot(1), 'socket'), { rejected: true });

        service.updateCursor(publicId, alice, { x: 1, y: 2 }, 'socket');
        assert.deepStrictEqual(emitted.at(-1)?.args, [publicId, 'alice', { x: 1, y: 2 }]);
    });

    it('invites each editor once, and refuses invalid ones', async () => {
        const { service } = createService();
        const { publicId } = await service.create(host, 'study');

        await assert.rejects(service.inviteEditor(publicId, host, 'alice'), HexplorerLiveClientError);

        service.setStreaming(publicId, host, true);

        await service.inviteEditor(publicId, host, 'alice');
        await service.inviteEditor(publicId, host, 'alice');
        await service.inviteEditor(publicId, host, 'bob');

        assert.deepStrictEqual(service.getSession(publicId)?.editors.map(p => p.publicId), ['alice', 'bob']);

        await assert.rejects(service.inviteEditor(publicId, alice, 'bob'), HexplorerLiveClientError);
        await assert.rejects(service.inviteEditor(publicId, host, 'host'), HexplorerLiveClientError);
        await assert.rejects(service.inviteEditor(publicId, host, 'bot'), HexplorerLiveClientError);
        await assert.rejects(service.inviteEditor(publicId, host, 'unknown'), HexplorerLiveClientError);
    });

    it('removes editors: by host, or by themselves, and when stream stops', async () => {
        const { service, emitted } = createService();
        const publicId = await startStream(service);

        await service.inviteEditor(publicId, host, 'alice');
        await service.inviteEditor(publicId, host, 'bob');

        assertClientError(() => service.removeEditor(publicId, alice, 'bob'), 'hexplorer_live.errors.not_host');

        service.removeEditor(publicId, alice, 'alice');
        assert.deepStrictEqual(service.getSession(publicId)?.editors.map(p => p.publicId), ['bob']);
        assert.deepStrictEqual(emitted.at(-1)?.args, [publicId, 'alice', null]);

        service.removeEditor(publicId, host, 'bob');
        assert.deepStrictEqual(service.getSession(publicId)?.editors, []);

        await service.inviteEditor(publicId, host, 'alice');
        service.setStreaming(publicId, host, false);
        assert.deepStrictEqual(service.getSession(publicId)?.editors, []);
    });
});
