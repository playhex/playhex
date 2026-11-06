import assert from 'assert';
import { beforeEach, describe, it } from 'mocha';
import { BadRequestError, HttpError, NotFoundError } from 'routing-controllers';
import { v4 as uuidv4 } from 'uuid';
import { parse } from 'content-range';
import type { Response } from 'express';
import HexplorerStudyController from '../../controllers/http/api/HexplorerStudyController.js';
import type HexplorerStudyRepository from '../../repositories/HexplorerStudyRepository.js';
import type PlayerModerationActionRepository from '../../repositories/PlayerModerationActionRepository.js';
import { HexplorerStudy, Player } from '../../../shared/app/models/index.js';
import { createHexplorerState, HEXPLORER_STUDY_MAX_NODES, type HexplorerStudyInput } from '../../../shared/app/hexplorerStudy.js';
import { RateLimitReachedError } from '../../services/rate-limiters.js';

type SerializedStudy = {
    publicId: string;
    title: null | string;
    author: { publicId: string };
    forkedFrom: null | { publicId: string };
};

const createPlayer = (publicId: string, isGuest = false): Player => {
    const player = new Player();

    player.publicId = publicId;
    player.pseudo = publicId;
    player.isGuest = isGuest;

    return player;
};

const input = (others: Partial<HexplorerStudyInput> = {}): HexplorerStudyInput => ({
    title: 'Study',
    data: createHexplorerState(5),
    ...others,
});

const isHttpError = (httpCode: number) => (e: unknown): boolean =>
    e instanceof HttpError && e.httpCode === httpCode
;

describe('HexplorerStudyController', () => {
    let author: Player;
    let guest: Player;
    let studies: Map<string, HexplorerStudy>;
    let restricted: boolean;
    let controller: HexplorerStudyController;

    beforeEach(() => {
        // Rate limit is by player, and shared between tests
        author = createPlayer(uuidv4());
        guest = createPlayer(uuidv4(), true);
        studies = new Map();
        restricted = false;

        const repository = {
            findByPublicId: (publicId: string) => Promise.resolve(studies.get(publicId) ?? null),
            findByAuthor: (player: Player) => {
                const results = [...studies.values()].filter(study => study.author === player);

                return Promise.resolve({ results, count: results.length + 30 });
            },
            save: (study: HexplorerStudy) => {
                studies.set(study.publicId, study);

                return Promise.resolve(study);
            },
            remove: (study: HexplorerStudy) => {
                studies.delete(study.publicId);

                return Promise.resolve();
            },
        } as unknown as HexplorerStudyRepository;

        const moderation = {
            mustNotBeContentRestricted: () => restricted ? Promise.reject(new HttpError(403)) : Promise.resolve(),
        } as unknown as PlayerModerationActionRepository;

        controller = new HexplorerStudyController(repository, moderation);
    });

    const post = async (player: Player, body = input()) => await controller.postStudy(player, body) as SerializedStudy;

    it('creates a study, also for guests, and anyone can read it', async () => {
        const { publicId, author: studyAuthor, forkedFrom } = await post(guest);

        assert.strictEqual(studyAuthor.publicId, guest.publicId);
        assert.strictEqual(forkedFrom, null);

        const study = await controller.getStudy(publicId) as SerializedStudy & { data: unknown };

        assert.strictEqual(study.title, 'Study');
        assert.deepStrictEqual(study.data, createHexplorerState(5));
    });

    it('normalizes title', async () => {
        assert.strictEqual((await post(author, input({ title: '  Hello  ' }))).title, 'Hello');
        assert.strictEqual((await post(author, input({ title: '   ' }))).title, null);
    });

    it('refuses invalid data or title', async () => {
        await assert.rejects(post(author, input({ data: { boardsize: 5 } as never })), BadRequestError);
        await assert.rejects(post(author, input({ title: 'x'.repeat(65) })), BadRequestError);
        await assert.rejects(post(author, input({ title: 12 as never })), BadRequestError);
    });

    it('refuses too many nodes', async () => {
        const data = createHexplorerState(5);

        data.nodes[0].children = Array.from({ length: HEXPLORER_STUDY_MAX_NODES }, (_, i) => i + 1);
        data.nodes.push(...data.nodes[0].children.map(id => ({ id, parentId: 0, children: [], data: { type: 'move' as const, move: 'pass' as const } })));

        await assert.rejects(post(author, input({ data })), BadRequestError);
    });

    it('limits new studies, and deleting one gives back one', async () => {
        const created = await post(author);

        for (let i = 0; i < 4; ++i) {
            await post(author);
        }

        await assert.rejects(post(author), RateLimitReachedError);
        await assert.rejects(post(author), RateLimitReachedError);

        await controller.deleteStudy(author, created.publicId);

        await post(author);
        await assert.rejects(post(author), RateLimitReachedError);
    });

    it('does not count refused studies, nor updates, in rate limit', async () => {
        const { publicId } = await post(author);

        for (let i = 0; i < 6; ++i) {
            await assert.rejects(post(author, input({ title: 'x'.repeat(65) })), BadRequestError);
            await controller.putStudy(author, publicId, input());
        }

        for (let i = 0; i < 4; ++i) {
            await post(author);
        }

        await assert.rejects(post(author), RateLimitReachedError);
    });

    it('refuses content restricted players', async () => {
        restricted = true;

        await assert.rejects(post(author), isHttpError(403));
    });

    it('returns 404 on unknown study', async () => {
        await assert.rejects(controller.getStudy('unknown'), NotFoundError);
    });

    it('lets only author update or delete', async () => {
        const { publicId } = await post(author);

        await assert.rejects(controller.putStudy(guest, publicId, input()), isHttpError(403));
        await assert.rejects(controller.deleteStudy(guest, publicId), isHttpError(403));

        const updated = await controller.putStudy(author, publicId, input({ title: 'Updated' })) as SerializedStudy;

        assert.strictEqual(updated.publicId, publicId);
        assert.strictEqual(updated.title, 'Updated');

        await controller.deleteStudy(author, publicId);

        assert.strictEqual(studies.size, 0);
    });

    it('lists studies of player, with total count in Content-Range', async () => {
        const { publicId } = await post(author);
        await post(guest);

        const headers = new Map<string, string>();
        const res = { set: (name: string, value: string) => headers.set(name, value) } as unknown as Response;
        const results = await controller.getMyStudies(author, {}, res) as SerializedStudy[];

        assert.deepStrictEqual(results.map(study => study.publicId), [publicId]);
        assert.strictEqual(parse(headers.get('Content-Range') ?? '')?.size, 31);
    });

    it('forks a study, keeping a link to initial study', async () => {
        const { publicId } = await post(author);
        const fork = await post(guest, input({ forkedFromPublicId: publicId }));

        assert.notStrictEqual(fork.publicId, publicId);
        assert.strictEqual(fork.author.publicId, guest.publicId);
        assert.strictEqual(fork.forkedFrom?.publicId, publicId);
        assert.strictEqual(studies.size, 2);
    });

    it('still saves a fork when initial study has been deleted', async () => {
        const fork = await post(guest, input({ forkedFromPublicId: 'deleted' }));

        assert.strictEqual(fork.forkedFrom, null);
    });

    it('does not change fork link on update', async () => {
        const { publicId } = await post(author);
        const fork = await post(guest, input({ forkedFromPublicId: publicId }));
        const updated = await controller.putStudy(guest, fork.publicId, input({ forkedFromPublicId: 'other' })) as SerializedStudy;

        assert.strictEqual(updated.forkedFrom?.publicId, publicId);
    });
});
