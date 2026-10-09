import assert from 'assert';
import { describe, it } from 'mocha';
import { solvePuzzlePosition } from '../../puzzles/solvePuzzlePosition.js';
import type { SolvePositionInput, SolvePositionOutput } from '../../ai-jobs/protocol.js';

describe('solvePuzzlePosition', () => {
    it('solves once without disabled cells', async () => {
        const calls: SolvePositionInput[] = [];

        const output = await solvePuzzlePosition({ size: 2, color: 'black', black: ['a1'], white: [] }, input => {
            calls.push(input);

            return Promise.resolve({
                winner: 'black',
                pv: [],
                children: { b1: { winner: 'black', pv: [] }, a2: { winner: 'white', pv: [] }, b2: { winner: null, pv: [] } },
            });
        });

        assert.deepStrictEqual(output, { winner: 'black', moves: { b1: 'black', a2: 'white', b2: null } });
        assert.deepStrictEqual(calls[0], calls[1]);
    });

    it('returns only results proven whatever disabled cells', async () => {
        const output = await solvePuzzlePosition({ size: 2, color: 'black', black: [], white: [], disabledCells: ['b2'] }, input => {
            const filledWithOpponent = input.white.includes('b2');

            // a1 wins only if b2 were black, b1 wins always, a2 loses always
            const result: SolvePositionOutput = {
                winner: filledWithOpponent ? 'white' : 'black',
                pv: [],
                children: {
                    a1: { winner: filledWithOpponent ? 'white' : 'black', pv: [] },
                    b1: { winner: 'black', pv: [] },
                    a2: { winner: 'white', pv: [] },
                },
            };

            return Promise.resolve(result);
        });

        assert.deepStrictEqual(output, { winner: null, moves: { a1: null, b1: 'black', a2: 'white' } });
    });
});
