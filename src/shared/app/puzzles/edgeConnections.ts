/**
 * Edge connections: on a partial board, an initial stone can be declared connected to one of its edges
 * through disabled cells, e.g a group outside the puzzle area that is known to reach the edge.
 *
 * Solver does not know disabled cells, so they are filled with stones (see fillDisabledCells()),
 * and a path of the stone color is drawn through disabled cells to the edge.
 * Path avoids cells next to playable cells, to not change the puzzle area.
 */

import { coordsToMove, parseMove, type Coords, type Move } from '@playhex/move-notation';
import { getEdgeFrame } from '../../hex-templates/template-connection.js';

export type PuzzleEdgeConnection = {
    /**
     * Initial stone, red or blue.
     */
    move: Move;

    /**
     * Edge of the stone color: red 0 top, 1 bottom; blue 0 left, 1 right. See getEdgeFrame().
     */
    edge: 0 | 1;
};

export type EdgeConnectionsPosition = {
    boardsize: number;
    redStones: Move[];
    blueStones: Move[];
    disabledCells: Move[];
};

const neighbours = ({ row, col }: Coords): Coords[] => [
    { row, col: col - 1 }, { row, col: col + 1 },
    { row: row - 1, col }, { row: row - 1, col: col + 1 },
    { row: row + 1, col }, { row: row + 1, col: col - 1 },
];

/**
 * Cost of a path cell next to a playable cell: such cells are used only if there is no other way.
 */
const NEXT_TO_PLAYABLE_COST = 100;

/**
 * Color of an initial stone, or null if cell has no stone.
 */
export const getStoneColor = ({ redStones, blueStones }: Pick<EdgeConnectionsPosition, 'redStones' | 'blueStones'>, move: Move): null | 0 | 1 =>
    redStones.includes(move) ? 0 : blueStones.includes(move) ? 1 : null;

/**
 * Path of disabled cells from stone to its edge, cheapest first: avoids cells next to playable cells.
 * Empty when stone is already on edge.
 *
 * @param used Disabled cells already used by another path
 *
 * @returns Null if edge cannot be reached through disabled cells
 */
export const findEdgePath = (position: EdgeConnectionsPosition, { move, edge }: PuzzleEdgeConnection, used: Set<Move> = new Set()): null | Move[] => {
    const { boardsize } = position;
    const color = getStoneColor(position, move);

    if (color === null) {
        return null;
    }

    const frame = getEdgeFrame(boardsize, color, edge);
    const start = parseMove(move);

    if (frame(start).row === 0) {
        return [];
    }

    const disabled = new Set(position.disabledCells);
    const inBoard = ({ row, col }: Coords): boolean => row >= 0 && col >= 0 && row < boardsize && col < boardsize;
    const isNextToPlayable = (coords: Coords): boolean => neighbours(coords)
        .some(neighbour => inBoard(neighbour) && coordsToMove(neighbour) !== move && !disabled.has(coordsToMove(neighbour)));

    // Dijkstra, few cells so a sorted list is enough
    const costs = new Map<Move, number>();
    const previous = new Map<Move, null | Move>();
    const queue: { move: Move, cost: number }[] = [];

    const visit = (coords: Coords, from: null | Move, fromCost: number): void => {
        const cell = coordsToMove(coords);

        if (!inBoard(coords) || !disabled.has(cell) || used.has(cell)) {
            return;
        }

        const cost = fromCost + 1 + (isNextToPlayable(coords) ? NEXT_TO_PLAYABLE_COST : 0);

        if (cost >= (costs.get(cell) ?? Infinity)) {
            return;
        }

        costs.set(cell, cost);
        previous.set(cell, from);
        queue.push({ move: cell, cost });
    };

    neighbours(start).forEach(neighbour => visit(neighbour, null, 0));

    while (queue.length > 0) {
        queue.sort((a, b) => a.cost - b.cost);

        const { move: current, cost } = queue.shift()!;

        if (cost > costs.get(current)!) {
            continue;
        }

        const coords = parseMove(current);

        if (frame(coords).row === 0) {
            const path: Move[] = [];

            for (let cell: null | Move = current; cell !== null; cell = previous.get(cell) ?? null) {
                path.unshift(cell);
            }

            return path;
        }

        neighbours(coords).forEach(neighbour => visit(neighbour, current, cost));
    }

    return null;
};

/**
 * Edges a stone can be connected to through disabled cells.
 */
export const getReachableEdges = (position: EdgeConnectionsPosition, move: Move): (0 | 1)[] =>
    ([0, 1] as const).filter(edge => findEdgePath(position, { move, edge }) !== null);

export type EdgePaths = {
    /**
     * Disabled cells to fill with red, and blue, stones.
     */
    red: Move[];
    blue: Move[];

    /**
     * Indexes of edge connections that cannot be drawn: invalid stone, edge not reachable,
     * or path blocked by another connection path.
     */
    impossible: number[];
};

/**
 * Paths of all edge connections, each one through disabled cells not used by previous ones.
 */
export const getEdgePaths = (position: EdgeConnectionsPosition, edgeConnections: PuzzleEdgeConnection[] = []): EdgePaths => {
    const paths: EdgePaths = { red: [], blue: [], impossible: [] };
    const used = new Set<Move>();

    edgeConnections.forEach((connection, index) => {
        const path = findEdgePath(position, connection, used);

        if (path === null) {
            paths.impossible.push(index);
            return;
        }

        path.forEach(cell => used.add(cell));
        paths[getStoneColor(position, connection.move) === 0 ? 'red' : 'blue'].push(...path);
    });

    return paths;
};

/**
 * Edge connections of a color, as expected by findTemplateConnection().
 */
export const getColorEdgeConnections = (position: Pick<EdgeConnectionsPosition, 'redStones' | 'blueStones'>, edgeConnections: PuzzleEdgeConnection[] = [], color: 0 | 1): PuzzleEdgeConnection[] =>
    edgeConnections.filter(({ move }) => getStoneColor(position, move) === color);

/**
 * Board edge a stone of a color is connected to, to draw an arrow.
 */
export const getBoardEdge = (color: 0 | 1, edge: 0 | 1): 'top' | 'bottom' | 'left' | 'right' => {
    if (color === 0) {
        return edge === 0 ? 'top' : 'bottom';
    }

    return edge === 0 ? 'left' : 'right';
};

/**
 * What a solve must prove about a player. Decides how disabled cells are filled, see fillDisabledCells().
 */
export type SolveClaim = 'win' | 'notWin';

/**
 * Solver does not know disabled cells, so they are filled with stones.
 * For any player, a disabled cell is never better than its own stone, and never worse than an opponent stone.
 * So to prove player wins, disabled cells are filled with opponent stones,
 * and to prove player does not win, they are filled with player stones.
 *
 * Paths of stones declared connected to their edge are then drawn with their color, see getEdgePaths().
 */
export const fillDisabledCells = (
    black: Move[],
    white: Move[],
    disabledCells: Move[],
    player: 'black' | 'white',
    claim: SolveClaim,
    edgePaths: Pick<EdgePaths, 'red' | 'blue'> = { red: [], blue: [] },
): { black: Move[], white: Move[] } => {
    const filledWithBlack = (player === 'black') === (claim === 'notWin');
    const bluePath = new Set(edgePaths.blue);
    const redPath = new Set(edgePaths.red);

    return {
        black: filledWithBlack ? [...black, ...disabledCells.filter(cell => !bluePath.has(cell))] : [...black, ...edgePaths.red],
        white: filledWithBlack ? [...white, ...edgePaths.blue] : [...white, ...disabledCells.filter(cell => !redPath.has(cell))],
    };
};

/**
 * Initial position as sent to solver, disabled cells filled to prove a claim about player.
 * See fillDisabledCells().
 */
export const getSolverFilledPosition = (
    position: EdgeConnectionsPosition,
    edgeConnections: PuzzleEdgeConnection[],
    playerColor: 0 | 1,
    claim: SolveClaim,
): { redStones: Move[], blueStones: Move[] } => {
    const { black, white } = fillDisabledCells(
        position.redStones,
        position.blueStones,
        position.disabledCells,
        playerColor === 0 ? 'black' : 'white',
        claim,
        getEdgePaths(position, edgeConnections),
    );

    return { redStones: black, blueStones: white };
};
