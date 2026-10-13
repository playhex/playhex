import assert from 'assert';
import '../mockDom.js';
import { cellPolygons } from '../../cells-mask/cellsMaskGraphics.js';

describe('cellPolygons', () => {
    it('covers only the hexagon for inner cells', () => {
        assert.strictEqual(cellPolygons(1, 1, 3).length, 1);
    });

    it('extrudes edge cells outside the board', () => {
        const [hexagon, slice] = cellPolygons(0, 1, 3);

        assert.strictEqual(hexagon.length, 6);
        assert.strictEqual(slice.length, 4);

        // Top edge: slice goes up
        assert.ok(Math.min(...slice.map(p => p.y)) < Math.min(...hexagon.map(p => p.y)));
    });

    it('extrudes corner cells in both directions, and the corner between', () => {
        assert.strictEqual(cellPolygons(0, 0, 3).length, 4);
        assert.strictEqual(cellPolygons(2, 2, 3).length, 4);
    });

    it('makes slices of adjacent edge cells touching without overlapping', () => {
        const [, left] = cellPolygons(0, 0, 3);
        const [, right] = cellPolygons(0, 1, 3);

        const leftMaxX = Math.max(...left.map(p => p.x));
        const rightMinX = Math.min(...right.map(p => p.x));

        assert.ok(Math.abs(leftMaxX - rightMinX) < 1e-9);
    });
});
