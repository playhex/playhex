import { BOARD_DEFAULT_SIZE, PlayerIndex } from '../game-engine';

const { min, max, floor } = Math;

export type GameOptionsData = {
    /**
     * Defaults to Board.
     */
    boardsize?: number;

    /**
     * Who plays first.
     * null: random (default)
     * 0: Host begins
     * 1: Opponent or bot begins
     */
    firstPlayer?: null | PlayerIndex;
};

const DEFAULT_BOARDSIZE = BOARD_DEFAULT_SIZE;
const MIN_BOARDSIZE = 1;
const MAX_BOARDSIZE = 25;

const sanitizeBoardsize = (boardsize: unknown): number => {
    if (!boardsize) {
        return DEFAULT_BOARDSIZE;
    }

    const sanitized = floor(min(max(+boardsize, MIN_BOARDSIZE), MAX_BOARDSIZE));

    return Number.isInteger(sanitized)
        ? sanitized
        : DEFAULT_BOARDSIZE
    ;
};

const sanitizeFirstPlayer = (firstPlayer: unknown): null | PlayerIndex => {
    if (0 === firstPlayer || '0' === firstPlayer) {
        return 0;
    }

    if (1 === firstPlayer || '1' === firstPlayer) {
        return 1;
    }

    return null;
};

export const sanitizeGameOptions = (gameOptions: GameOptionsData): GameOptionsData => {
    return {
        boardsize: sanitizeBoardsize(gameOptions.boardsize ?? DEFAULT_BOARDSIZE),
        firstPlayer: sanitizeFirstPlayer(gameOptions.firstPlayer),
    }
};

