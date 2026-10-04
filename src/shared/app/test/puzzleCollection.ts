import assert from 'assert';
import { describe, it } from 'mocha';
import { moveInList, normalizePuzzleCollectionInput, validatePuzzleCollectionInput } from '../puzzles/puzzleCollection.js';

describe('puzzleCollection', () => {
    describe('normalizePuzzleCollectionInput', () => {
        it('trims name and description, empty description becomes null', () => {
            assert.deepStrictEqual(
                normalizePuzzleCollectionInput({ name: '  Ladders  ', description: '   ' }),
                { name: 'Ladders', description: null },
            );
        });
    });

    describe('validatePuzzleCollectionInput', () => {
        it('accepts a valid input', () => {
            assert.deepStrictEqual(validatePuzzleCollectionInput({ name: 'Ladders', description: 'Basics' }), []);
        });

        it('requires a name', () => {
            assert.strictEqual(validatePuzzleCollectionInput({ name: '   ' }).length, 1);
        });

        it('rejects a too long name', () => {
            assert.strictEqual(validatePuzzleCollectionInput({ name: 'a'.repeat(65) }).length, 1);
        });
    });

    describe('moveInList', () => {
        it('moves item up and down', () => {
            assert.deepStrictEqual(moveInList(['a', 'b', 'c'], 1, -1), ['b', 'a', 'c']);
            assert.deepStrictEqual(moveInList(['a', 'b', 'c'], 1, 1), ['a', 'c', 'b']);
        });

        it('does not move outside the list', () => {
            assert.deepStrictEqual(moveInList(['a', 'b'], 0, -1), ['a', 'b']);
            assert.deepStrictEqual(moveInList(['a', 'b'], 1, 1), ['a', 'b']);
        });

        it('does not mutate the list', () => {
            const list = ['a', 'b'];

            moveInList(list, 0, 1);

            assert.deepStrictEqual(list, ['a', 'b']);
        });
    });
});
