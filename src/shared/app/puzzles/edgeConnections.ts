/**
 * Edge connections: on a partial board, an initial stone can be declared connected to one of its edges
 * through disabled cells, e.g a group outside the puzzle area that is known to reach the edge.
 *
 * Solver does not know disabled cells, so they are filled with stones (see fillDisabledCells()),
 * and a path of the stone color is drawn through disabled cells to the edge.
 *
 * The whole group of the stone is connected: path can start from any initial stone or fixed cell (see below)
 * of same color adjacent to it.
 *
 * Path must not change the puzzle: it never touches a playable cell, unless this cell is an opponent stone,
 * or a stone connected to the same edge, or next to one (already connected through this stone).
 * Stones connected to the same edge share their paths: a path can stop on another path of the same edge,
 * or on another stone connected to the same edge.
 *
 * Puzzle author can also fix the color of some disabled cells, e.g to keep a bridge from a real game:
 * they are filled with this color whatever the claim, and paths go around them, or through them when same color.
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

/**
 * Disabled cell filled with a color chosen by puzzle author, see fillDisabledCells().
 */
export type PuzzleFixedFill = {
    move: Move;
    color: 0 | 1;
};

export type EdgeConnectionsPosition = {
    boardsize: number;
    redStones: Move[];
    blueStones: Move[];
    disabledCells: Move[];
    fixedFill?: PuzzleFixedFill[];
};

const neighbours = ({ row, col }: Coords): Coords[] => [
    { row, col: col - 1 }, { row, col: col + 1 },
    { row: row - 1, col }, { row: row - 1, col: col + 1 },
    { row: row + 1, col }, { row: row + 1, col: col - 1 },
];

/**
 * Color of an initial stone, or null if cell has no stone.
 */
export const getStoneColor = ({ redStones, blueStones }: Pick<EdgeConnectionsPosition, 'redStones' | 'blueStones'>, move: Move): null | 0 | 1 =>
    redStones.includes(move) ? 0 : blueStones.includes(move) ? 1 : null;

export type EdgePaths = {
    /**
     * Disabled cells to fill with red, and blue, stones.
     */
    red: Move[];
    blue: Move[];

    /**
     * Indexes of edge connections that cannot be drawn: invalid or duplicate stone,
     * or no path to the edge through disabled cells without changing the puzzle.
     */
    impossible: number[];
};

/**
 * Paths of all edge connections, see file header.
 * Path cells of a connection are not reused by connections of another color or edge.
 */
export const getEdgePaths = (position: EdgeConnectionsPosition, edgeConnections: PuzzleEdgeConnection[] = []): EdgePaths => {
    const { boardsize } = position;
    const paths: EdgePaths = { red: [], blue: [], impossible: [] };
    const disabled = new Set(position.disabledCells);
    const fixed = new Set((position.fixedFill ?? []).map(({ move }) => move));
    const fixedOf = (color: 0 | 1): Set<Move> => new Set((position.fixedFill ?? [])
        .filter(cell => cell.color === color && disabled.has(cell.move))
        .map(({ move }) => move),
    );
    const fixedByColor = [fixedOf(0), fixedOf(1)];
    const inBoard = ({ row, col }: Coords): boolean => row >= 0 && col >= 0 && row < boardsize && col < boardsize;
    const boardNeighbours = (coords: Coords): Move[] => neighbours(coords).filter(inBoard).map(coordsToMove);

    // Indexed by color then edge
    const groupStones = [[new Set<Move>(), new Set<Move>()], [new Set<Move>(), new Set<Move>()]];
    // Path cells and stones already connected to the edge
    const groupConnected = [[new Set<Move>(), new Set<Move>()], [new Set<Move>(), new Set<Move>()]];
    const used = new Set<Move>();
    const connections: (null | { move: Move, color: 0 | 1, edge: 0 | 1, group: Move[] })[] = [];

    /**
     * Initial stones and fixed cells connected to this stone through cells of same color.
     */
    const getGroup = (move: Move, color: 0 | 1): Move[] => {
        const stones = new Set([...(color === 0 ? position.redStones : position.blueStones), ...fixedByColor[color]]);
        const group = new Set<Move>([move]);

        for (const stone of group) {
            boardNeighbours(parseMove(stone))
                .filter(cell => stones.has(cell))
                .forEach(cell => group.add(cell));
        }

        return [...group];
    };

    for (const { move, edge } of edgeConnections) {
        const color = getStoneColor(position, move);

        if (color === null || connections.some(connection => connection?.move === move)) {
            connections.push(null);
            continue;
        }

        const group = getGroup(move, color);

        group.forEach(stone => groupStones[color][edge].add(stone));
        connections.push({ move, color, edge, group });
    }

    const findPath = ({ color, edge, group }: { color: 0 | 1, edge: 0 | 1, group: Move[] }): null | Move[] => {
        const frame = getEdgeFrame(boardsize, color, edge);
        const connected = groupConnected[color][edge];
        const otherEdgeConnected = groupConnected[color][1 - edge];

        if (group.some(stone => frame(parseMove(stone)).row === 0 || boardNeighbours(parseMove(stone)).some(cell => connected.has(cell)))) {
            return [];
        }

        // Playable cells a path can touch
        const touchable = new Set<Move>(color === 0 ? position.blueStones : position.redStones);

        for (const stone of groupStones[color][edge]) {
            touchable.add(stone);
            boardNeighbours(parseMove(stone)).forEach(cell => touchable.add(cell));
        }

        // Fixed cells of same color are already filled with it, they can be shared by paths.
        // Still checked for touched cells: once joined to the path, they connect their neighbours to the edge.
        const canUse = (cell: Move): boolean => disabled.has(cell)
            && (fixedByColor[color].has(cell) || (!fixed.has(cell) && !used.has(cell)))
            && boardNeighbours(parseMove(cell)).every(neighbour => disabled.has(neighbour)
                ? !otherEdgeConnected.has(neighbour)
                : touchable.has(neighbour),
            );

        // A*, distance to edge as heuristic: tries cells towards the edge first,
        // so a straight path is found without exploring around.
        const costs = new Map<Move, number>();
        const previous = new Map<Move, null | Move>();
        const open: { move: Move, cost: number, distance: number }[] = [];
        const closed = new Set<Move>();

        const visit = (cell: Move, from: null | Move, cost: number): void => {
            if (closed.has(cell) || cost >= (costs.get(cell) ?? Infinity) || !canUse(cell)) {
                return;
            }

            costs.set(cell, cost);
            previous.set(cell, from);
            open.push({ move: cell, cost, distance: frame(parseMove(cell)).row });
        };

        group.forEach(stone => boardNeighbours(parseMove(stone)).forEach(cell => visit(cell, null, 1)));

        while (open.length > 0) {
            let best = 0;

            for (let i = 1; i < open.length; ++i) {
                const a = open[i], b = open[best];

                if (a.cost + a.distance < b.cost + b.distance || (a.cost + a.distance === b.cost + b.distance && a.distance < b.distance)) {
                    best = i;
                }
            }

            const [{ move: current, cost, distance }] = open.splice(best, 1);

            if (closed.has(current)) {
                continue;
            }

            closed.add(current);

            const currentNeighbours = boardNeighbours(parseMove(current));

            if (distance === 0 || currentNeighbours.some(cell => connected.has(cell))) {
                const path: Move[] = [];

                for (let cell: null | Move = current; cell !== null; cell = previous.get(cell) ?? null) {
                    path.unshift(cell);
                }

                return path;
            }

            currentNeighbours.forEach(cell => visit(cell, current, cost + 1));
        }

        return null;
    };

    // A stone can reach its edge through another stone connected later: retry until no more stone connects
    let pending = connections.map((_, index) => index).filter(index => connections[index] !== null);
    let previousPendingCount = -1;

    while (pending.length !== previousPendingCount) {
        previousPendingCount = pending.length;

        pending = pending.filter(index => {
            const connection = connections[index]!;
            const path = findPath(connection);

            if (path === null) {
                return true;
            }

            connection.group.forEach(stone => groupConnected[connection.color][connection.edge].add(stone));

            path.forEach(cell => groupConnected[connection.color][connection.edge].add(cell));

            // Fixed cells are filled apart, see fillDisabledCells()
            const filledPath = path.filter(cell => !fixed.has(cell));

            filledPath.forEach(cell => used.add(cell));
            paths[connection.color === 0 ? 'red' : 'blue'].push(...filledPath);

            return false;
        });
    }

    paths.impossible = connections.flatMap((connection, index) => connection === null || pending.includes(index) ? [index] : []);

    return paths;
};

/**
 * Edges a stone can be connected to through disabled cells, along with other edge connections.
 */
export const getReachableEdges = (position: EdgeConnectionsPosition, move: Move, edgeConnections: PuzzleEdgeConnection[] = []): (0 | 1)[] => {
    const others = edgeConnections.filter(connection => connection.move !== move);

    return ([0, 1] as const).filter(edge => !getEdgePaths(position, [...others, { move, edge }]).impossible.includes(others.length));
};

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
 * Paths of stones declared connected to their edge are then drawn with their color, see getEdgePaths(),
 * and fixed cells with the color chosen by puzzle author, whatever the claim.
 */
export const fillDisabledCells = (
    black: Move[],
    white: Move[],
    disabledCells: Move[],
    player: 'black' | 'white',
    claim: SolveClaim,
    edgePaths: Pick<EdgePaths, 'red' | 'blue'> = { red: [], blue: [] },
    fixedFill: PuzzleFixedFill[] = [],
): { black: Move[], white: Move[] } => {
    const filledWithBlack = (player === 'black') === (claim === 'notWin');
    const bluePath = new Set(edgePaths.blue);
    const redPath = new Set(edgePaths.red);
    const fixed = fixedFill.filter(({ move }) => disabledCells.includes(move));
    const fixedCells = new Set(fixed.map(({ move }) => move));
    const free = disabledCells.filter(cell => !fixedCells.has(cell));
    const fixedOf = (color: 0 | 1): Move[] => fixed.filter(cell => cell.color === color).map(({ move }) => move);

    return {
        black: [...(filledWithBlack ? [...black, ...free.filter(cell => !bluePath.has(cell))] : [...black, ...edgePaths.red]), ...fixedOf(0)],
        white: [...(filledWithBlack ? [...white, ...edgePaths.blue] : [...white, ...free.filter(cell => !redPath.has(cell))]), ...fixedOf(1)],
    };
};

/**
 * Best effort to get as many red as blue stones, plus or minus one, on a position filled by fillDisabledCells(),
 * e.g for a neural network trained on real games positions.
 *
 * Switches stones of the color with more stones, only on disabled cells not from a path nor fixed,
 * surrounded by such stones, and not on board border.
 * Switched stones are then enclosed by stones of the other color, dead,
 * so neither the puzzle nor paths change, and connections of the surrounding color go around them.
 */
export const balanceFilledStones = (
    { black, white }: { black: Move[], white: Move[] },
    disabledCells: Move[],
    edgePaths: Pick<EdgePaths, 'red' | 'blue'> = { red: [], blue: [] },
    fixedFill: PuzzleFixedFill[] = [],
): { black: Move[], white: Move[] } => {
    const blackMore = black.length > white.length;
    const [more, less] = blackMore ? [black, white] : [white, black];
    const kept = new Set([...edgePaths.red, ...edgePaths.blue, ...fixedFill.map(({ move }) => move)]);
    const moreStones = new Set(more);
    const fill = new Set(disabledCells.filter(cell => !kept.has(cell) && moreStones.has(cell)));
    const switched = new Set([...fill]
        .filter(cell => neighbours(parseMove(cell)).every(({ row, col }) => row >= 0 && col >= 0 && fill.has(coordsToMove({ row, col }))))
        .slice(0, Math.max(0, Math.ceil((more.length - less.length - 1) / 2))),
    );
    const balancedMore = more.filter(move => !switched.has(move));
    const balancedLess = [...less, ...switched];

    return blackMore
        ? { black: balancedMore, white: balancedLess }
        : { black: balancedLess, white: balancedMore }
    ;
};

/**
 * Position as sent to katahex: disabled cells filled to prove player wins, then balanced,
 * see fillDisabledCells() and balanceFilledStones().
 *
 * @param edgePaths From initial position, see getEdgePaths()
 */
export const fillForKatahex = (
    black: Move[],
    white: Move[],
    disabledCells: Move[],
    player: 'black' | 'white',
    edgePaths: Pick<EdgePaths, 'red' | 'blue'>,
    fixedFill: PuzzleFixedFill[] = [],
): { black: Move[], white: Move[] } => balanceFilledStones(
    fillDisabledCells(black, white, disabledCells, player, 'win', edgePaths, fixedFill),
    disabledCells,
    edgePaths,
    fixedFill,
);

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
        position.fixedFill,
    );

    return { redStones: black, blueStones: white };
};
