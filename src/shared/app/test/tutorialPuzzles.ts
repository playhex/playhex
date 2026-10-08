import assert from 'assert';
import { describe, it } from 'mocha';
import { validatePuzzle } from '../puzzles/puzzleTree.js';
import { bridgePuzzles, zigguratPuzzles } from '../tutorial/tutorialPuzzles.js';

describe('tutorialPuzzles', () => {
    for (const [name, puzzles] of Object.entries({ bridgePuzzles, zigguratPuzzles })) {
        puzzles.forEach((puzzle, index) => {
            it(`${name}[${index}] is a valid puzzle`, () => {
                assert.deepStrictEqual(validatePuzzle(puzzle), []);
            });
        });
    }
});
