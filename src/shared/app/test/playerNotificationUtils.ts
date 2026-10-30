import assert from 'assert';
import { describe, it } from 'mocha';
import { groupPlayerNotificationByGame } from '../playerNotificationUtils.js';
import { Game, Player } from '../models/index.js';
import { createPlayerNotification } from '../models/PlayerNotification.js';

const createGame = (publicId: string): Game => {
    const game = new Game();

    game.publicId = publicId;

    return game;
};

const createNotification = (game: null | Game) => createPlayerNotification('custom', { text: '' }, new Player(), game);

describe('playerNotificationUtils', () => {
    describe('groupPlayerNotificationByGame', () => {
        it('returns no group when there is no notification', () => {
            assert.deepStrictEqual(groupPlayerNotificationByGame([]), []);
        });

        it('groups only consecutive notifications from the same game', () => {
            const gameA = createGame('a');
            const gameB = createGame('b');

            const groups = groupPlayerNotificationByGame([
                createNotification(gameA),
                createNotification(gameA),
                createNotification(gameB),
                createNotification(gameA),
            ]);

            assert.deepStrictEqual(
                groups.map(({ game, playerNotifications }) => [game?.publicId, playerNotifications.length]),
                [['a', 2], ['b', 1], ['a', 1]],
            );
        });

        it('groups consecutive notifications without game', () => {
            const gameA = createGame('a');

            const groups = groupPlayerNotificationByGame([
                createNotification(null),
                createNotification(null),
                createNotification(gameA),
                createNotification(null),
            ]);

            assert.deepStrictEqual(
                groups.map(({ game, playerNotifications }) => [game?.publicId ?? null, playerNotifications.length]),
                [[null, 2], ['a', 1], [null, 1]],
            );
        });
    });
});
