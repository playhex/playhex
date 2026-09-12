import Board, { BOARD_DEFAULT_SIZE } from './Board.js';
import EngineGame from './EngineGame.js';
import IllegalMove from './errors/IllegalMove.js';
import { PlayerIndex } from './Types.js';
import { calcRandomMove } from './randomBot.js';

export {
    Board,
    BOARD_DEFAULT_SIZE,
    EngineGame,
    IllegalMove,
    calcRandomMove,
};

export type {
    PlayerIndex,
};
