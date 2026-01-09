import Board, { BOARD_DEFAULT_SIZE } from './Board.js';
import Game from './Game.js';
import IllegalMove from './errors/IllegalMove.js';
import { PlayerIndex } from './Types.js';
import { calcRandomMove } from './randomBot.js';

export {
    Board,
    BOARD_DEFAULT_SIZE,
    Game,
    IllegalMove,
    calcRandomMove,
};

export type {
    PlayerIndex,
};
