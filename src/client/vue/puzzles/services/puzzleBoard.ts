import { DisabledCellMark, type GameView } from '@playhex/pixi-board';
import { coordsToMove, type Move } from '@playhex/move-notation';
import type { Puzzle } from '../../../../shared/app/models/index.js';

export type ColoredMove = {
    move: Move;
    color: 0 | 1;
};

const DISABLED_CELLS_GROUP = 'disabled_cells';

/**
 * Draws puzzle initial stones and disabled cells, then given moves, on an emptied board.
 */
export const drawPuzzlePosition = (
    gameView: GameView,
    puzzle: Pick<Puzzle, 'boardsize' | 'redStones' | 'blueStones' | 'disabledCells'>,
    moves: ColoredMove[] = [],
): void => {
    for (let row = 0; row < puzzle.boardsize; ++row) {
        for (let col = 0; col < puzzle.boardsize; ++col) {
            gameView.setStone(coordsToMove({ row, col }), null);
        }
    }

    // Above board and its shading pattern, below 4-4 anchors, stones and marks
    gameView.setGroupZIndex(DISABLED_CELLS_GROUP, -30);
    gameView.removeEntitiesGroup(DISABLED_CELLS_GROUP);

    for (const move of puzzle.disabledCells) {
        gameView.addEntity(new DisabledCellMark().setCoords(move), DISABLED_CELLS_GROUP);
    }

    for (const move of puzzle.redStones) gameView.setStone(move, 0);
    for (const move of puzzle.blueStones) gameView.setStone(move, 1);

    for (const { move, color } of moves) {
        gameView.setStone(move, color);
    }
};
