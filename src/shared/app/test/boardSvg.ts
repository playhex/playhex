import { describe, it } from 'mocha';
import assert from 'assert';
import { boardSvgColors, gameMovesToBoardSvgPosition, renderBoardSvg } from '../boardSvg.js';

const countOccurrences = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

describe('boardSvg', () => {
    it('renders each cell, stones colors, and players sides', () => {
        const svg = renderBoardSvg({
            boardsize: 5,
            stones: { red: ['a1', 'c3'], blue: ['b2'] },
            x: 0,
            y: 0,
            width: 1200,
            height: 630,
        });

        // Each cell is an outer hexagon (lines between cells) and an inner hexagon
        assert.strictEqual(countOccurrences(svg, `fill="${boardSvgColors.cellStroke}"`), 25);
        assert.strictEqual(countOccurrences(svg, `<polygon points="`), 50);
        assert.strictEqual(countOccurrences(svg, `"${boardSvgColors.red}"/>`), 2 + 1);
        assert.strictEqual(countOccurrences(svg, `"${boardSvgColors.blue}"/>`), 1 + 1);
        assert.strictEqual(countOccurrences(svg, `fill="${boardSvgColors.emptyCell}"`), 22);

        // Red sides and blue sides
        assert.strictEqual(countOccurrences(svg, '<path'), 2);
        assert.ok(!svg.includes('clipPath'));
    });

    it('marks last move and highlighted cells', () => {
        const svg = renderBoardSvg({
            boardsize: 3,
            stones: { red: ['a1'], blue: [] },
            lastMove: 'a1',
            highlighted: ['a1', 'a2'],
            x: 0,
            y: 0,
            width: 600,
            height: 300,
        });

        assert.strictEqual(countOccurrences(svg, `stroke="${boardSvgColors.highlight}"`), 1);
        assert.strictEqual(countOccurrences(svg, 'fill-opacity'), 2);
    });

    it('greys out disabled cells', () => {
        const svg = renderBoardSvg({
            boardsize: 3,
            stones: { red: ['a1'], blue: [] },
            disabledCells: ['c1', 'c2'],
            x: 0,
            y: 0,
            width: 600,
            height: 300,
        });

        assert.strictEqual(countOccurrences(svg, `fill="${boardSvgColors.disabledCell}"`), 2);
        assert.strictEqual(countOccurrences(svg, `fill="${boardSvgColors.cellStroke}"`), 9);
    });

    it('hides cells, and clips sides to displayed cells', () => {
        const svg = renderBoardSvg({
            boardsize: 3,
            stones: { red: [], blue: [] },
            hiddenCells: ['a1', 'b1', 'c1'],
            id: 'puzzle',
            x: 0,
            y: 0,
            width: 600,
            height: 300,
        });

        assert.strictEqual(countOccurrences(svg, `fill="${boardSvgColors.cellStroke}"`), 6);
        assert.ok(svg.includes('<clipPath id="puzzle-clip">'));
        assert.ok(svg.includes('clip-path="url(#puzzle-clip)"'));
    });

    it('fits board in given area, without zooming too much on small boards', () => {
        const scaleOf = (svg: string): number => Number(/scale\(([\d.]+)\)/.exec(svg)![1]);
        const translateOf = (svg: string): number[] => /translate\(([-\d.]+) ([-\d.]+)\)/.exec(svg)!.slice(1).map(Number);

        const big = renderBoardSvg({ boardsize: 11, stones: { red: [], blue: [] }, x: 0, y: 0, width: 1200, height: 630 });

        // Board 11×11 diamond is bounded by its height: 11 × 1.5 rows of 20 radius cells, sides included
        assert.ok(scaleOf(big) > 1 && scaleOf(big) < 2);

        // First cell, left corner, is on the left of the area
        assert.ok(translateOf(big)[0] > 0 && translateOf(big)[0] < 200);

        const small = renderBoardSvg({ boardsize: 2, stones: { red: [], blue: [] }, x: 0, y: 0, width: 1200, height: 630 });

        assert.strictEqual(scaleOf(small), 2);
    });

    it('replays moves with swap', () => {
        const { stones, lastMove } = gameMovesToBoardSvgPosition(5, true, ['b1', 'swap-pieces', 'c3']);

        // b1 swapped: red stone becomes a blue stone on mirrored cell
        assert.deepStrictEqual(stones.blue, ['a2']);
        assert.deepStrictEqual(stones.red, ['c3']);
        assert.strictEqual(lastMove, 'c3');
    });

    it('returns winning path of an ended game', () => {
        const { winningPath } = gameMovesToBoardSvgPosition(2, false, ['a1', 'b1', 'a2']);

        assert.deepStrictEqual(winningPath.sort(), ['a1', 'a2']);
    });
});
