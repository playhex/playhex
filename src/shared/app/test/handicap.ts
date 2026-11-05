import assert from 'assert';
import type { HexMove } from '@playhex/move-notation';
import { canUndoWithHandicap, checkHandicapMove, getHandicapSetupLength, getHandicapStatus, isForcedHandicapPass, isGameInCancelWindow, isValidPresetHandicap, normalizeHandicapOptions, toValidPresetHandicap } from '../handicap.js';
import { guessDemerHandicap } from '../demerHandicap.js';

const stone: HexMove = 'a1';
const swap: HexMove = 'swap-pieces';
const pass: HexMove = 'pass';

/**
 * Plays a game until handicap is in place:
 * players place stones, or do what's asked for, and server plays forced passes.
 */
const playSetup = (demer: number, swapChoice: null | HexMove): HexMove[] => {
    const moves: HexMove[] = [];

    for (let status = getHandicapStatus(demer, moves); status !== null; status = getHandicapStatus(demer, moves)) {
        if (status.type === 'forced_pass') {
            moves.push(pass);
        } else if (status.type === 'swap_decision') {
            moves.push(swapChoice ?? pass);
        } else if (moves.length === 1 && swapChoice !== null) {
            moves.push(swapChoice);
        } else {
            moves.push(stone);
        }
    }

    return moves;
};

describe('Handicap', () => {
    it('produces moves sequences from Demer handicap system', () => {
        assert.deepStrictEqual(playSetup(0, null), []);
        assert.deepStrictEqual(playSetup(0.5, null), [stone]);
        assert.deepStrictEqual(playSetup(1, null), [stone, pass, stone]);
        assert.deepStrictEqual(playSetup(1, swap), [stone, swap, stone, pass, stone]);
        assert.deepStrictEqual(playSetup(1.5, null), [stone, pass, stone]);
        assert.deepStrictEqual(playSetup(2, null), [stone, pass, stone, pass, stone]);
        assert.deepStrictEqual(playSetup(2, swap), [stone, swap, stone, pass, stone, pass, stone]);
        assert.deepStrictEqual(playSetup(2.5, null), [stone, pass, stone, pass, stone]);
        assert.deepStrictEqual(playSetup(-1, null), [stone, stone, pass, stone]);
        assert.deepStrictEqual(playSetup(-1, swap), [stone, swap, pass, stone]);
        assert.deepStrictEqual(playSetup(-2, null), [stone, stone, pass, stone, pass, stone]);
        assert.deepStrictEqual(playSetup(-2, swap), [stone, swap, pass, stone, pass, stone]);
    });

    it('gives moves that guessDemerHandicap() reads as the same handicap', () => {
        const nextMoves: HexMove[] = [stone, stone, stone, stone];

        for (const demer of [1, 2, 3, -1, -2, -3]) {
            for (const swapChoice of [null, swap]) {
                assert.strictEqual(
                    guessDemerHandicap(true, false, [...playSetup(demer, swapChoice), ...nextMoves]),
                    demer,
                    `demer ${demer}, ${swapChoice}`,
                );
            }
        }

        for (const demer of [0.5, 1.5, 2.5]) {
            assert.strictEqual(guessDemerHandicap(false, true, [...playSetup(demer, null), ...nextMoves]), demer);
        }
    });

    it('counts remaining stones', () => {
        assert.deepStrictEqual(
            getHandicapStatus(2, []),
            { type: 'first_stone', playerIndex: 0, swappable: true, followUpPlayerIndex: 0, followUpStones: 2 },
        );
        assert.deepStrictEqual(
            getHandicapStatus(-1, []),
            { type: 'first_stone', playerIndex: 0, swappable: true, followUpPlayerIndex: 1, followUpStones: 2 },
        );
        assert.deepStrictEqual(
            getHandicapStatus(0.5, []),
            { type: 'first_stone', playerIndex: 0, swappable: false, followUpPlayerIndex: 0, followUpStones: 0 },
        );
        assert.deepStrictEqual(getHandicapStatus(2, [stone]), { type: 'swap_decision', playerIndex: 1, beneficiaryIndex: 0, stones: 2 });
        assert.deepStrictEqual(getHandicapStatus(2, [stone, pass]), { type: 'stones', playerIndex: 0, stones: 2, afterSwap: false });
        assert.deepStrictEqual(getHandicapStatus(2, [stone, swap]), { type: 'stones', playerIndex: 0, stones: 3, afterSwap: true });
        assert.deepStrictEqual(getHandicapStatus(2, [stone, swap, stone, pass]), { type: 'stones', playerIndex: 0, stones: 2, afterSwap: false });
        assert.deepStrictEqual(getHandicapStatus(-1, [stone, swap, pass]), { type: 'stones', playerIndex: 1, stones: 1, afterSwap: false });
        assert.deepStrictEqual(getHandicapStatus(2, [stone, swap, stone]), { type: 'forced_pass', playerIndex: 1, stones: 2 });
        assert.deepStrictEqual(getHandicapStatus(1.5, [stone]), { type: 'forced_pass', playerIndex: 1, stones: 1 });
        assert.deepStrictEqual(getHandicapStatus(-1, [stone]), { type: 'stones', playerIndex: 1, stones: 2, afterSwap: false });
        assert.deepStrictEqual(getHandicapStatus(-1, [stone, stone]), { type: 'forced_pass', playerIndex: 0, stones: 1 });
    });

    it('checks moves while handicap is being set up', () => {
        assert.strictEqual(checkHandicapMove(0, [], pass), true);
        assert.strictEqual(checkHandicapMove(1, [stone], swap), true);
        assert.strictEqual(checkHandicapMove(1, [stone], pass), true);
        assert.notStrictEqual(checkHandicapMove(1, [stone], stone), true);
        assert.notStrictEqual(checkHandicapMove(1, [], pass), true);
        assert.notStrictEqual(checkHandicapMove(1, [stone, pass], pass), true);
        assert.notStrictEqual(checkHandicapMove(1.5, [stone], stone), true);
        assert.strictEqual(checkHandicapMove(1, [stone, pass, stone], pass), true, 'handicap is in place');
    });

    it('recognizes passes of handicap setup', () => {
        const moves = [stone, pass, stone, pass];

        assert.strictEqual(isForcedHandicapPass(0, moves, 1), false);
        assert.strictEqual(isForcedHandicapPass(1, moves, 1), false, 'player refused to swap');
        assert.strictEqual(isForcedHandicapPass(1.5, moves, 1), true);
        assert.strictEqual(isForcedHandicapPass(1.5, moves, 3), false, 'after handicap setup');
        assert.strictEqual(isForcedHandicapPass(2, [stone, pass, stone, pass, stone], 3), true);
    });

    it('prevents undoing handicap setup', () => {
        assert.strictEqual(getHandicapSetupLength(1, [stone, swap]), 5);
        assert.strictEqual(canUndoWithHandicap(0, [stone], 1), true);
        assert.strictEqual(canUndoWithHandicap(1, [stone, pass, stone], 1), false);
        assert.strictEqual(canUndoWithHandicap(1, [stone, pass, stone, stone], 1), true);
        assert.strictEqual(canUndoWithHandicap(1, [stone, pass, stone, stone], 2), false);
    });

    it('keeps game cancelable during handicap setup, and until next move', () => {
        assert.strictEqual(isGameInCancelWindow(0, [stone]), true);
        assert.strictEqual(isGameInCancelWindow(0, [stone, pass]), false, 'no handicap: pass is a played move');
        assert.strictEqual(isGameInCancelWindow(1.5, [stone, pass, stone]), true);
        assert.strictEqual(isGameInCancelWindow(1.5, [stone, pass, stone, stone]), false);
        assert.strictEqual(isGameInCancelWindow(1.5, [stone, pass, stone, pass]), false, 'manual pass after setup is a played move');
        assert.strictEqual(isGameInCancelWindow(5, [stone, pass, stone, pass, stone, pass]), true);
        assert.strictEqual(isGameInCancelWindow(1, [stone, swap]), true);
        assert.strictEqual(isGameInCancelWindow(1, [stone, swap, stone, pass, stone]), true);
        assert.strictEqual(isGameInCancelWindow(1, [stone, swap, stone, pass, stone, stone]), false);
        assert.strictEqual(isGameInCancelWindow(-1, [stone, stone, pass]), true);
        assert.strictEqual(isGameInCancelWindow(-1, [stone, stone, pass, stone, stone]), false);
    });

    it('validates preset handicap', () => {
        assert.strictEqual(isValidPresetHandicap(-5), true);
        assert.strictEqual(isValidPresetHandicap(0.5), true);
        assert.strictEqual(isValidPresetHandicap(0.25), false);
        assert.strictEqual(isValidPresetHandicap(5.5), false);

        assert.strictEqual(toValidPresetHandicap(1.3), 1.5);
        assert.strictEqual(toValidPresetHandicap(12), 5);
        assert.strictEqual(toValidPresetHandicap(NaN), 0);
        assert.ok(Object.is(toValidPresetHandicap(-0.1), 0), 'must not be -0');
    });

    it('imposes options depending on handicap', () => {
        assert.deepStrictEqual(
            normalizeHandicapOptions({ presetHandicap: 1.5, swapRule: true, firstPlayer: null }),
            { presetHandicap: 1.5, swapRule: false, firstPlayer: 0 },
        );
        assert.deepStrictEqual(
            normalizeHandicapOptions({ presetHandicap: -0.5, swapRule: true, firstPlayer: 0 }),
            { presetHandicap: -0.5, swapRule: false, firstPlayer: 1 },
        );
        assert.deepStrictEqual(
            normalizeHandicapOptions({ presetHandicap: -2, swapRule: false, firstPlayer: null }),
            { presetHandicap: -2, swapRule: true, firstPlayer: null },
        );
        assert.deepStrictEqual(
            normalizeHandicapOptions({ presetHandicap: 0, swapRule: false, firstPlayer: 1 }),
            { presetHandicap: 0, swapRule: false, firstPlayer: 1 },
        );
    });
});
