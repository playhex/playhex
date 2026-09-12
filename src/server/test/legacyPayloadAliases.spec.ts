import assert from 'assert';
import { describe, it } from 'mocha';
import { addLegacyAliases } from '../services/legacyPayloadAliases.js';

describe('legacyPayloadAliases', () => {
    it('duplicates gameToPlayers as hostedGameToPlayers', () => {
        const payload = addLegacyAliases({
            publicId: 'abc',
            gameToPlayers: [{ player: { pseudo: 'Player A' } }],
        });

        assert.deepStrictEqual(payload.gameToPlayers, [{ player: { pseudo: 'Player A' } }]);
        assert.deepStrictEqual((payload as never as { hostedGameToPlayers: unknown }).hostedGameToPlayers, [{ player: { pseudo: 'Player A' } }]);
    });

    it('duplicates game as hostedGame, including when null', () => {
        const payload = addLegacyAliases({
            notified: false,
            game: null,
        }) as { game: null, hostedGame?: null };

        assert.strictEqual('hostedGame' in payload, true);
        assert.strictEqual(payload.hostedGame, null);
    });

    it('aliases nested nodes, and keeps both names on the same reference', () => {
        const payload = addLegacyAliases({
            matches: [
                { game: { publicId: 'abc', gameToPlayers: [] } },
            ],
        }) as never as {
            matches: {
                game: { hostedGameToPlayers: unknown[] };
                hostedGame: { hostedGameToPlayers: unknown[] };
            }[];
        };

        const match = payload.matches[0];

        assert.strictEqual(match.hostedGame, match.game, 'both names share the same reference');
        assert.deepStrictEqual(match.game.hostedGameToPlayers, [], 'nested node is aliased too');
    });

    it('aliases arrays of games', () => {
        const payload = addLegacyAliases([
            { gameToPlayers: ['a'] },
            { gameToPlayers: ['b'] },
        ]) as never as { hostedGameToPlayers: string[] }[];

        assert.deepStrictEqual(payload.map(game => game.hostedGameToPlayers), [['a'], ['b']]);
    });

    it('does not mutate the given payload', () => {
        const game = { publicId: 'abc', gameToPlayers: [] };

        addLegacyAliases(game);

        assert.deepStrictEqual(Object.keys(game), ['publicId', 'gameToPlayers']);
    });

    it('keeps dates as dates', () => {
        const createdAt = new Date('2026-09-12T10:00:00.000Z');
        const payload = addLegacyAliases({ createdAt, gameToPlayers: [] });

        assert.strictEqual(payload.createdAt, createdAt);
    });

    it('supports circular references', () => {
        type Node = { publicId: string, gameToPlayers: unknown[], rematchedFrom?: Node };

        const game: Node = { publicId: 'abc', gameToPlayers: [] };
        game.rematchedFrom = game;

        const payload = addLegacyAliases(game) as never as { hostedGameToPlayers: unknown[], rematchedFrom: unknown };

        assert.strictEqual(payload.rematchedFrom, payload, 'cycle is preserved, not expanded');
        assert.deepStrictEqual(payload.hostedGameToPlayers, []);
    });

    it('does not overwrite a legacy name already present', () => {
        const payload = addLegacyAliases({ game: 'new', hostedGame: 'existing' });

        assert.strictEqual(payload.hostedGame, 'existing');
    });
});
