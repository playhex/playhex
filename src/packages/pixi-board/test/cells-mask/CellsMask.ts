import assert from 'assert';
import { CellsMask } from '../../cells-mask/CellsMask.js';

describe('CellsMask', () => {
    it('displays all cells', () => {
        const mask = CellsMask.all(3);

        assert.strictEqual(mask.hasHiddenCells(), false);
        assert.strictEqual(mask.getVisibleCoords().length, 9);
    });

    it('hides some cells', () => {
        const mask = CellsMask.hiding(3, ['a1', { row: 2, col: 1 }]);

        assert.strictEqual(mask.hasHiddenCells(), true);
        assert.strictEqual(mask.isVisible('a1'), false);
        assert.strictEqual(mask.isVisible('b3'), false);
        assert.strictEqual(mask.isVisible('b2'), true);
        assert.strictEqual(mask.getVisibleCoords().length, 7);
    });

    it('displays only some cells', () => {
        const mask = CellsMask.showingOnly(3, ['b2', 'c3']);

        assert.strictEqual(mask.isVisible('b2'), true);
        assert.strictEqual(mask.isVisible({ row: 2, col: 2 }), true);
        assert.strictEqual(mask.isVisible('a1'), false);
        assert.deepStrictEqual(mask.getVisibleCoords(), [{ row: 1, col: 1 }, { row: 2, col: 2 }]);
    });

    it('ignores cells out of board, and they are never visible', () => {
        const mask = CellsMask.showingOnly(3, ['d4', 'a1']);

        assert.deepStrictEqual(mask.getVisibleCoords(), [{ row: 0, col: 0 }]);
        assert.strictEqual(CellsMask.all(3).isVisible('d1'), false);
        assert.strictEqual(CellsMask.all(3).isVisible({ row: -1, col: 0 }), false);
    });
});
