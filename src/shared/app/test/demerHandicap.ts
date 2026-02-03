import assert from 'assert';
import { guessDemerHandicap } from '../demerHandicap.js';
import { HexMove } from '../../move-notation/hex-move-notation.js';

const move: HexMove = 'a1';
const red: HexMove = move;
const blue: HexMove = move;
const blueSwaps: HexMove = 'swap-pieces';
const pass: HexMove = 'pass';
const etc: HexMove[] = [move, move, move];

describe('Demer Handicap', () => {
    it('guesses Demer handicap from a game', () => {

        // Games with no moves yet

        assert.strictEqual(
            guessDemerHandicap(true, false),
            0,
            'No handicap on normal games',
        );

        assert.strictEqual(
            guessDemerHandicap(false, false),
            'N/S',
            'Just "no swap" when swap is disabled but colors are still random',
        );

        assert.strictEqual(
            guessDemerHandicap(false, true),
            0.5,
            '0.5 handicap for black when no swap and first player is predefined',
        );

        assert.strictEqual(
            guessDemerHandicap(true, true),
            0,
            'First player predefined, swap rule enabled, but not yet moves, cannot say, returns no handicap',
        );

        /*
         * From examples in https://www.hexwiki.net/index.php/Handicap
         */

        // 0 move advantage for Red (no handicap): Red starts and the swap rule is used.

        assert.strictEqual(
            guessDemerHandicap(true, true, [red, blueSwaps, red, blue]),
            0,
            '0 => Red, Blue swaps, Red, Blue, ...',
        );

        assert.strictEqual(
            guessDemerHandicap(true, true, [red, blue, red, blue]),
            0,
            '0 => Red, Blue, Red, Blue, ...',
        );

        // 0.5 move advantage for Red: Red starts and the swap rule is not used.

        assert.strictEqual(
            guessDemerHandicap(false, true, [red, blue, red, blue, ...etc]),
            0.5,
            '0.5 => Red, Blue, Red, Blue, ...',
        );

        // 1 move advantage for Red: Red gets one additional move before Blue's first non-swap move.

        assert.strictEqual(
            guessDemerHandicap(true, true, [red, blueSwaps, red, pass, red, blue, ...etc]),
            1,
            '1 => Red, Blue swaps, Red, Red, Blue, ...',
        );

        assert.strictEqual(
            guessDemerHandicap(true, true, [red, pass, red, blue, red, blue, ...etc]),
            1,
            '1 => Red, Red, Blue, Red, Blue, ...',
        );

        // 1.5 move advantage for Red: Red plays the first two pieces and the swap rule is not used.

        assert.strictEqual(
            guessDemerHandicap(false, true, [red, pass, red, blue, red, ...etc]),
            1.5,
            '1.5 => Red, Red, Blue, Red, ...',
        );

        // 2 move advantage for Red: Red gets two additional moves before Blue's first non-swap move.

        assert.strictEqual(
            guessDemerHandicap(true, true, [red, blueSwaps, red, pass, red, pass, red, blue, ...etc]),
            2,
            '2 => Red, Blue swaps, Red, Red, Red, Blue, ...',
        );

        assert.strictEqual(
            guessDemerHandicap(true, true, [red, pass, red, pass, red, blue, red, blue, ...etc]),
            2,
            '2 => Red, Red, Red, Blue, Red, Blue, ...',
        );

        // Advantages to white

        // 1 move advantage for Blue: Blue gets one additional move before Red's second move.

        assert.strictEqual(
            guessDemerHandicap(true, true, [red, blueSwaps, pass, blue, red, ...etc]),
            -1,
            '-1 => Red, Blue swaps, Blue, Red, ...',
        );

        assert.strictEqual(
            guessDemerHandicap(true, true, [red, blue, pass, blue, red, ...etc]),
            -1,
            '-1 => Red, Blue, Blue, Red, ...',
        );

        // 2 move advantage for Blue: Blue gets two additional moves before Red's second move.

        assert.strictEqual(
            guessDemerHandicap(true, true, [red, blueSwaps, pass, blue, pass, blue, red, ...etc]),
            -2,
            '-2 => Red, Blue swaps, Blue, Blue, Red, ...',
        );

        assert.strictEqual(
            guessDemerHandicap(true, true, [red, blue, pass, blue, pass, blue, red, ...etc]),
            -2,
            '-2 => Red, Blue, Blue, Blue, Red, ...',
        );
    });
});
