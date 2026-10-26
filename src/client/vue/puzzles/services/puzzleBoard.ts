import { Graphics, type Container, type PointData } from 'pixi.js';
import { BoardEntity, CellsMask, DisabledCellMark, EdgeArrowMark, Hex, type GameView } from '@playhex/pixi-board';
import { coordsToMove, type Move } from '@playhex/move-notation';
import type { Puzzle } from '../../../../shared/app/models/index.js';
import { getBoardEdge, getStoneColor } from '../../../../shared/app/puzzles/edgeConnections.js';

export type ColoredMove = {
    move: Move;
    color: 0 | 1;
};

const DISABLED_CELLS_GROUP = 'disabled_cells';
const EDGE_CONNECTIONS_GROUP = 'edge_connections';
const SOLVER_FILL_GROUP = 'solver_fill';

/**
 * Stone on a disabled cell as sent to solver.
 * Fixed when its color is chosen by puzzle author, see fillDisabledCells().
 */
export type SolverFillStone = ColoredMove & {
    fixed?: boolean;
};

/**
 * Stone added on a disabled cell only to preview what solver sees:
 * a smaller translucent hexagon, so it is not mistaken for a puzzle stone.
 * Bigger and more opaque when color is fixed by puzzle author.
 */
class SolverFillMark extends BoardEntity
{
    constructor(
        private color: 0 | 1,
        private fixed = false,
    ) {
        super();

        this.listenThemeChange = true;
    }

    protected override draw(): Container
    {
        const { player1, player2 } = this.theme.colors;
        const g = new Graphics();

        const path: PointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push(Hex.cornerCoords(i, Hex.RADIUS * (this.fixed ? 0.7 : 0.55)));
        }

        g.poly(path);
        g.fill({ color: this.color === 0 ? player1 : player2, alpha: this.fixed ? 0.9 : 0.5 });

        return g;
    }
}

type PuzzlePosition = Pick<Puzzle, 'boardsize' | 'redStones' | 'blueStones' | 'disabledCells'> & Partial<Pick<Puzzle, 'hideDisabledCells' | 'edgeConnections'>>;

/**
 * Cells displayed to player, to pass to GameView constructor:
 * disabled cells hidden if puzzle hides them, showing a partial board.
 * Null to display whole board.
 */
export const createPuzzleCellsMask = (puzzle: PuzzlePosition): null | CellsMask => {
    return puzzle.hideDisabledCells
        ? CellsMask.hiding(puzzle.boardsize, puzzle.disabledCells)
        : null
    ;
};

/**
 * Draws puzzle initial stones, disabled cells and arrows on stones connected to their edge,
 * then given moves, on an emptied board.
 * Disabled cells are greyed out, unless hidden by puzzle, see createPuzzleCellsMask().
 *
 * @param solverFill Stones on disabled cells as sent to solver, drawn apart from real stones, see fillDisabledCells()
 */
export const drawPuzzlePosition = (
    gameView: GameView,
    puzzle: PuzzlePosition,
    moves: ColoredMove[] = [],
    solverFill: SolverFillStone[] = [],
): void => {
    for (let row = 0; row < puzzle.boardsize; ++row) {
        for (let col = 0; col < puzzle.boardsize; ++col) {
            gameView.setStone(coordsToMove({ row, col }), null);
        }
    }

    // Above board and its shading pattern, below 4-4 anchors, stones and marks
    gameView.setGroupZIndex(DISABLED_CELLS_GROUP, -30);
    gameView.removeEntitiesGroup(DISABLED_CELLS_GROUP);

    if (!puzzle.hideDisabledCells) {
        for (const move of puzzle.disabledCells) {
            gameView.addEntity(new DisabledCellMark().setCoords(move), DISABLED_CELLS_GROUP);
        }
    }

    // Above disabled cells, below stones
    gameView.setGroupZIndex(SOLVER_FILL_GROUP, -20);
    gameView.removeEntitiesGroup(SOLVER_FILL_GROUP);

    for (const { move, color, fixed } of solverFill) {
        gameView.addEntity(new SolverFillMark(color, fixed).setCoords(move), SOLVER_FILL_GROUP);
    }

    for (const move of puzzle.redStones) gameView.setStone(move, 0);
    for (const move of puzzle.blueStones) gameView.setStone(move, 1);

    gameView.removeEntitiesGroup(EDGE_CONNECTIONS_GROUP);

    for (const { move, edge } of puzzle.edgeConnections ?? []) {
        const color = getStoneColor(puzzle, move);

        if (color !== null) {
            gameView.addEntity(new EdgeArrowMark(getBoardEdge(color, edge)).setCoords(move), EDGE_CONNECTIONS_GROUP);
        }
    }

    for (const { move, color } of moves) {
        gameView.setStone(move, color);
    }
};
