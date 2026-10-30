import { coordsToMove, parseMove, type Coords, type HexMove, type Move } from '@playhex/move-notation';
import EngineGame from '../game-engine/EngineGame.js';

/**
 * Colors of PlayHex default dark theme, see pixi-board/themes/playhex.
 */
export const boardSvgColors = {
    background: '#212529',
    emptyCell: '#343a40',
    cellStroke: '#1a1d20',
    disabledCell: '#232425',
    red: '#dc3545',
    blue: '#0d6efd',
    text: '#dee2e6',
    highlight: '#ffc107',
};

export type BoardSvgStones = {
    red: Move[];
    blue: Move[];
};

export type BoardSvgOptions = {
    boardsize: number;
    stones: BoardSvgStones;

    /**
     * Marked with a circle.
     */
    lastMove?: null | Move;

    /**
     * Cells to highlight, e.g the winning path.
     */
    highlighted?: Move[];

    /**
     * Greyed out cells, e.g puzzle isolation.
     */
    disabledCells?: Move[];

    /**
     * Cells not drawn, with their sides, showing a partial board.
     * Board is zoomed on displayed cells.
     */
    hiddenCells?: Move[];

    /**
     * Unique id in the whole svg image, to reference board clip path.
     */
    id?: string;

    /**
     * Area where the board, with its sides, must fit. Board is centered in it.
     */
    x: number;
    y: number;
    width: number;
    height: number;
};

type Point = { x: number, y: number };

const { PI, sin, cos, sqrt } = Math;
const SQRT3 = sqrt(3);

/*
 * Same geometry as pixi-board Hex and hexBoard renderer,
 * so that board looks the same as in game page.
 */
const RADIUS = 20;
const PADDING = 0.06;
const SIDES_WIDTH = 0.35;

/**
 * Same as pixi-board GameView default orientation (11 × PI/6):
 * long diagonal is horizontal, which fits well in a wide image.
 */
const ROTATION = -PI / 6;

/**
 * Rendered cell radius limit, so that a small partial board is not too zoomed in.
 */
const MAX_CELL_RADIUS = 40;

const round = (n: number): number => Math.round(n * 100) / 100;

const add = (...points: Point[]): Point => points.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y }), { x: 0, y: 0 });

const scale = (p: Point, k: number): Point => ({ x: p.x * k, y: p.y * k });

const middle = (a: Point, b: Point): Point => scale(add(a, b), 0.5);

const rotate = (p: Point, angle: number): Point => ({
    x: p.x * cos(angle) - p.y * sin(angle),
    y: p.x * sin(angle) + p.y * cos(angle),
});

/**
 * Cell center, before board rotation.
 */
export const cellCoords = (row: number, col: number): Point => ({
    x: col * RADIUS * SQRT3 + row * RADIUS * SQRT3 / 2,
    y: row * RADIUS * 1.5,
});

/**
 * Hexagon corner, from 0 (top) clockwise to 5.
 */
const cornerCoords = (i: number, dist = RADIUS): Point => ({
    x: dist * sin(2 * PI * i / 6),
    y: -dist * cos(2 * PI * i / 6),
});

const pointsString = (points: Point[]): string => points.map(p => `${round(p.x)},${round(p.y)}`).join(' ');

const hexagon = (center: Point, radius: number): Point[] => [0, 1, 2, 3, 4, 5].map(i => add(center, cornerCoords(i, radius)));

/**
 * Red sides (top, bottom) and blue sides (right, left), following cells shape,
 * filled to board middle, below cells. Port of pixi-board hexBoard createSides().
 */
const sidesPaths = (boardsize: number): [string, string] => {
    const sideWidth = RADIUS * SIDES_WIDTH;
    const sideDist = RADIUS * (SIDES_WIDTH + 1);
    const last = boardsize - 1;
    const c = cellCoords;
    const boardMiddle = middle(c(0, 0), c(last, last));
    const path = (points: Point[]): string => 'M' + points.map(p => `${round(p.x)} ${round(p.y)}`).join('L') + 'Z';

    const top: Point[] = [add(c(0, 0), cornerCoords(5, sideDist))];
    const right: Point[] = [add(c(0, last), middle(cornerCoords(0, sideDist), cornerCoords(1, sideDist)))];
    const bottom: Point[] = [add(c(last, last), cornerCoords(2, sideDist))];
    const left: Point[] = [add(c(last, 0), middle(cornerCoords(3, sideDist), cornerCoords(4, sideDist)))];

    for (let i = 0; i < last; ++i) {
        top.push(add(c(0, i), cornerCoords(0, sideDist)), add(c(0, i), cornerCoords(1), cornerCoords(0, sideWidth)));
        right.push(add(c(i, last), cornerCoords(1, sideDist)), add(c(i, last), cornerCoords(2), cornerCoords(1, sideWidth)));
    }

    for (let i = last; i > 0; --i) {
        bottom.push(add(c(last, i), cornerCoords(3, sideDist)), add(c(last, i), cornerCoords(4), cornerCoords(3, sideWidth)));
        left.push(add(c(i, 0), cornerCoords(4, sideDist)), add(c(i, 0), cornerCoords(5), cornerCoords(4, sideWidth)));
    }

    top.push(add(c(0, last), cornerCoords(0, sideDist)), add(c(0, last), middle(cornerCoords(0, sideDist), cornerCoords(1, sideDist))), boardMiddle);
    right.push(add(c(last, last), cornerCoords(1, sideDist)), add(c(last, last), cornerCoords(2, sideDist)), boardMiddle);
    bottom.push(add(c(last, 0), cornerCoords(3, sideDist)), add(c(last, 0), middle(cornerCoords(3, sideDist), cornerCoords(4, sideDist))), boardMiddle);
    left.push(add(c(0, 0), cornerCoords(4, sideDist)), add(c(0, 0), cornerCoords(5, sideDist)), boardMiddle);

    return [path(top) + path(bottom), path(right) + path(left)];
};

const edgeNormals = {
    top: { x: 0, y: -1 },
    bottom: { x: 0, y: 1 },
    left: { x: -SQRT3 / 2, y: 0.5 },
    right: { x: SQRT3 / 2, y: -0.5 },
};

/**
 * Area of a displayed cell: its hexagon, and the slice of sides in front of it.
 * Port of pixi-board cellsMaskGraphics cellPolygons().
 */
const cellClipPolygons = (row: number, col: number, boardsize: number): Point[][] => {
    const center = cellCoords(row, col);
    const length = RADIUS * 3;
    const halfSpacing = RADIUS * SQRT3 / 2;
    const last = boardsize - 1;
    const normals = ([
        [row === 0, edgeNormals.top],
        [col === last, edgeNormals.right],
        [row === last, edgeNormals.bottom],
        [col === 0, edgeNormals.left],
    ] as const).filter(([isOnEdge]) => isOnEdge).map(([, normal]) => normal);

    const polygons = [hexagon(center, RADIUS)];

    for (const normal of normals) {
        const tangent = { x: -normal.y, y: normal.x };
        const a = add(center, scale(tangent, halfSpacing));
        const b = add(center, scale(tangent, -halfSpacing));

        polygons.push([a, b, add(b, scale(normal, length)), add(a, scale(normal, length))]);
    }

    if (normals.length === 2) {
        const [n0, n1] = normals;

        polygons.push([center, add(center, scale(n0, length)), add(center, scale(n0, length), scale(n1, length)), add(center, scale(n1, length))]);
    }

    return polygons;
};

/**
 * Renders a Hex board as svg elements (without the <svg> root),
 * to be embedded in a bigger svg image.
 */
export const renderBoardSvg = (options: BoardSvgOptions): string => {
    const { boardsize, stones, lastMove, highlighted } = options;
    const id = options.id ?? 'board';
    const cellColors = new Map<Move, string>();

    (options.disabledCells ?? []).forEach(move => cellColors.set(move, boardSvgColors.disabledCell));
    stones.red.forEach(move => cellColors.set(move, boardSvgColors.red));
    stones.blue.forEach(move => cellColors.set(move, boardSvgColors.blue));

    const hidden = new Set(options.hiddenCells ?? []);
    const allCoords: Coords[] = [];

    for (let row = 0; row < boardsize; ++row) {
        for (let col = 0; col < boardsize; ++col) {
            allCoords.push({ row, col });
        }
    }

    const visibleCoords = allCoords.filter(coords => !hidden.has(coordsToMove(coords)));

    // Fit rotated visible cells, with their sides, in given area.
    // Fit whole board when all cells are hidden, to not get NaN.
    const extent = RADIUS * (1 + SIDES_WIDTH);
    const rotatedCenters = (visibleCoords.length > 0 ? visibleCoords : allCoords).map(({ row, col }) => rotate(cellCoords(row, col), ROTATION));
    const minX = Math.min(...rotatedCenters.map(p => p.x)) - extent;
    const maxX = Math.max(...rotatedCenters.map(p => p.x)) + extent;
    const minY = Math.min(...rotatedCenters.map(p => p.y)) - extent;
    const maxY = Math.max(...rotatedCenters.map(p => p.y)) + extent;
    const k = Math.min(options.width / (maxX - minX), options.height / (maxY - minY), MAX_CELL_RADIUS / RADIUS);
    const tx = options.x + options.width / 2 - k * (minX + maxX) / 2;
    const ty = options.y + options.height / 2 - k * (minY + maxY) / 2;

    const parts: string[] = [];
    const [redSides, blueSides] = sidesPaths(boardsize);

    parts.push(`<path d="${redSides}" fill="${boardSvgColors.red}"/>`);
    parts.push(`<path d="${blueSides}" fill="${boardSvgColors.blue}"/>`);

    const highlightedSet = new Set(highlighted ?? []);

    for (const { row, col } of visibleCoords) {
        const move = coordsToMove({ row, col });
        const center = cellCoords(row, col);

        parts.push(`<polygon points="${pointsString(hexagon(center, RADIUS * (1 + PADDING)))}" fill="${boardSvgColors.cellStroke}"/>`);
        parts.push(`<polygon points="${pointsString(hexagon(center, RADIUS * (1 - PADDING)))}" fill="${cellColors.get(move) ?? boardSvgColors.emptyCell}"/>`);

        if (highlightedSet.has(move)) {
            parts.push(`<circle cx="${round(center.x)}" cy="${round(center.y)}" r="${RADIUS * 0.3}" fill="#ffffff" fill-opacity="0.6"/>`);
        }
    }

    if (lastMove && !hidden.has(lastMove)) {
        const { row, col } = parseMove(lastMove);
        const center = cellCoords(row, col);

        parts.push(`<circle cx="${round(center.x)}" cy="${round(center.y)}" r="${RADIUS * 0.45}" fill="none" stroke="${boardSvgColors.highlight}" stroke-width="${RADIUS * 0.16}"/>`);
    }

    let content = parts.join('');

    if (hidden.size > 0) {
        const clipPolygons = visibleCoords
            .flatMap(({ row, col }) => cellClipPolygons(row, col, boardsize))
            .map(polygon => `<polygon points="${pointsString(polygon)}"/>`)
            .join('')
        ;

        content = `<defs><clipPath id="${id}-clip">${clipPolygons}</clipPath></defs><g clip-path="url(#${id}-clip)">${content}</g>`;
    }

    return `<g transform="translate(${round(tx)} ${round(ty)}) scale(${round(k * 10000) / 10000}) rotate(${round(ROTATION * 180 / PI)})">${content}</g>`;
};

/**
 * Replays game moves to get stones on board, handles swap,
 * and the winning path if a player connected their sides.
 */
export const gameMovesToBoardSvgPosition = (boardsize: number, swapRule: boolean, moves: HexMove[]): { stones: BoardSvgStones, lastMove: null | Move, winningPath: Move[] } => {
    const engineGame = new EngineGame(boardsize);

    engineGame.setAllowSwap(swapRule);

    let lastMove: null | Move = null;

    for (const [index, move] of moves.entries()) {
        const playerIndex = index % 2 === 0 ? 0 : 1;

        try {
            engineGame.move(move, playerIndex);
        } catch {
            break;
        }

        if (move === 'swap-pieces') {
            lastMove = engineGame.getSwapCoords().mirror;
        } else if (move !== 'pass') {
            lastMove = move;
        }

        if (engineGame.hasWinner()) {
            break;
        }
    }

    const stones: BoardSvgStones = { red: [], blue: [] };

    engineGame.getBoard().getCells().forEach((cells, row) => cells.forEach((cell, col) => {
        if (cell !== null) {
            (cell === 0 ? stones.red : stones.blue).push(coordsToMove({ row, col }));
        }
    }));

    const winningPath = (engineGame.getBoard().getShortestWinningPath() ?? []).map(coordsToMove);

    return { stones, lastMove, winningPath };
};
