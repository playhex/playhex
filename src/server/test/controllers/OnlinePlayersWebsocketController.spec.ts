import assert from 'assert';
import { mock } from 'node:test';
import { afterEach, beforeEach, describe, it } from 'mocha';
import OnlinePlayersWebsocketController from '../../controllers/websocket/OnlinePlayersWebsocketController.js';
import OnlinePlayersService from '../../services/OnlinePlayersService.js';
import type { HexServer, HexSocket } from '../../server.js';
import Rooms from '../../../shared/app/Rooms.js';
import { Player } from '../../../shared/app/models/index.js';

type Count = { active: number, inactive: number };

describe('OnlinePlayersWebsocketController', () => {
    let service: OnlinePlayersService;
    let emittedCounts: Count[];
    let currentCount: Count;
    let controller: OnlinePlayersWebsocketController;
    const player = { publicId: 'player-a' } as Player;

    beforeEach(() => {
        mock.timers.enable({ apis: ['setTimeout'] });

        emittedCounts = [];
        currentCount = { active: 0, inactive: 0 };

        service = new OnlinePlayersService();
        service.getActiveAndInactivePlayersCount = () => ({ ...currentCount });

        const hexServer = {
            to: () => ({
                emit: (event: string, ...args: unknown[]) => {
                    if (event === 'onlinePlayersCount') {
                        emittedCounts.push(args[0] as Count);
                    }
                },
            }),
        } as unknown as HexServer;

        controller = new OnlinePlayersWebsocketController(hexServer, service);
    });

    afterEach(() => {
        mock.timers.reset();
    });

    const countChangesTo = (active: number): void => {
        currentCount = { active, inactive: 0 };
        service.emit('playerActive', player, false);
    };

    it('emits first count immediately, and last count at the end of the second', () => {
        countChangesTo(1);
        assert.deepStrictEqual(emittedCounts, [{ active: 1, inactive: 0 }]);

        countChangesTo(2);
        countChangesTo(3);
        assert.strictEqual(emittedCounts.length, 1);

        mock.timers.tick(1000);
        assert.deepStrictEqual(emittedCounts, [{ active: 1, inactive: 0 }, { active: 3, inactive: 0 }]);

        countChangesTo(4);
        assert.strictEqual(emittedCounts.length, 2, 'still throttled after the trailing emit');

        mock.timers.tick(1000);
        assert.deepStrictEqual(emittedCounts.at(-1), { active: 4, inactive: 0 });
    });

    it('does not emit at the end of the second when count is back to the emitted one', () => {
        countChangesTo(1);
        countChangesTo(2);
        countChangesTo(1);

        mock.timers.tick(1000);
        assert.deepStrictEqual(emittedCounts, [{ active: 1, inactive: 0 }]);
    });

    it('emits immediately again after a quiet second', () => {
        countChangesTo(1);
        mock.timers.tick(1000);

        countChangesTo(2);
        assert.deepStrictEqual(emittedCounts, [{ active: 1, inactive: 0 }, { active: 2, inactive: 0 }]);
    });

    it('does not leave a client joining during the second with a stale count', () => {
        countChangesTo(1);
        countChangesTo(2);

        const joinedCounts: Count[] = [];
        const socket = {
            emit: (event: string, ...args: unknown[]) => {
                if (event === 'onlinePlayersCount') {
                    joinedCounts.push(args[0] as Count);
                }
            },
        } as unknown as HexSocket;

        controller.onJoinRoom(socket, Rooms.onlinePlayersCount);
        const emittedCountBeforeJoin = emittedCounts.length;

        countChangesTo(1);
        mock.timers.tick(1000);

        const countSeenByClient = [...joinedCounts, ...emittedCounts.slice(emittedCountBeforeJoin)].at(-1);
        assert.deepStrictEqual(countSeenByClient, currentCount);
    });
});
