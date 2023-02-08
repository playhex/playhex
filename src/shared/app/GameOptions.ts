import { BOARD_DEFAULT_SIZE } from '../game-engine';

const { min, max, floor } = Math;

export type GameOptionsData = {
    /**
     * Defaults to Board.
     */
    boardsize?: number;
};

const DEFAULT_BOARDSIZE = BOARD_DEFAULT_SIZE;
const MIN_BOARDSIZE = 1;
const MAX_BOARDSIZE = 25;

const sanitizeBoardsize = (boardsize: number): number => {
    if (!boardsize) {
        return DEFAULT_BOARDSIZE;
    }

    const sanitized = floor(min(max(+boardsize, MIN_BOARDSIZE), MAX_BOARDSIZE));

    return Number.isInteger(sanitized)
        ? sanitized
        : DEFAULT_BOARDSIZE
    ;
};

export const sanitizeGameOptions = (gameOptions: GameOptionsData): GameOptionsData => {
    return {
        boardsize: sanitizeBoardsize(gameOptions.boardsize ?? DEFAULT_BOARDSIZE),
    }
};

