import assert from 'assert';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { Container } from 'typedi';
import { CandidatePositionsProvider } from '../../../services/anti-cheat/CandidatePositionsProvider.js';
import GameStore from '../../../store/GameStore.js';
import type { HexMove } from '@playhex/move-notation';
import { toCanonicalPosition } from '../../../../shared/position-comparator/position-comparator.js';
import type { GameState } from '../../../../shared/app/Types.js';
import type { TimestampedMove } from '../../../../shared/game-engine/Types.js';

type FakeGame = {
    state: GameState;
    isBotGame: boolean;
    movesHistory: TimestampedMove[];
};

describe('CandidatePositionsProvider', () => {
    let games: { [publicId: string]: FakeGame };

    beforeEach(() => {
        games = {};

        Container.set(GameStore, {
            getActiveGames: () => Object.fromEntries(
                Object.entries(games).map(([publicId, game]) => [publicId, {
                    getState: () => game.state,
                    getPlayers: () => [{ isBot: false }, { isBot: game.isBotGame }],
                    getEngineGame: () => ({
                        getSize: () => 11,
                        getMovesHistory: () => game.movesHistory,
                    }),
                }]),
            ),
        });
    });

    afterEach(() => {
        Container.remove(GameStore);
    });

    const timestamped = (moves: HexMove[]): TimestampedMove[] => moves.map(move => ({ move, playedAt: new Date() }));

    const playing = (moves: HexMove[]): FakeGame => ({ state: 'playing', isBotGame: false, movesHistory: timestamped(moves) });

    const stones = (provider: CandidatePositionsProvider) => {
        const { black, white } = toCanonicalPosition(provider.getCandidatePositions()[0]);

        return { black, white };
    };

    it('returns only playing 1v1 games', () => {
        games.a = playing(['a1', 'b2']);
        games.b = { ...playing(['a1', 'b2']), isBotGame: true };
        games.c = { ...playing(['a1', 'b2']), state: 'ended' };

        const candidates = new CandidatePositionsProvider().getCandidatePositions();

        assert.deepStrictEqual(candidates.map(candidate => candidate.gamePublicId), ['a']);
    });

    it('updates position after undo then replay, even with same moves count', () => {
        const provider = new CandidatePositionsProvider();
        const game = playing(['a1', 'b2', 'c3', 'd4']);
        games.a = game;

        assert.deepStrictEqual(stones(provider), { black: ['a1', 'c3'], white: ['b2', 'd4'] });

        // Undo 2 moves, then replay 2 other moves, without any check in between
        game.movesHistory.splice(2, 2, ...timestamped(['e5', 'f6']));

        assert.deepStrictEqual(stones(provider), { black: ['a1', 'e5'], white: ['b2', 'f6'] });
    });

    it('ignores an invalid game instead of breaking the whole check', () => {
        games.invalid = playing(['a1', 'b2', 'a1']);
        games.valid = playing(['a1', 'b2']);

        const candidates = new CandidatePositionsProvider().getCandidatePositions();

        assert.deepStrictEqual(candidates.map(candidate => candidate.gamePublicId), ['valid']);
    });
});
