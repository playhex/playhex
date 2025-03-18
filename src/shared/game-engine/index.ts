import Board, { BOARD_DEFAULT_SIZE } from './Board.js';
import Game from './Game.js';
import IllegalMove from './IllegalMove.js';
import Move, { SpecialMoveType } from './Move.js';
import { PlayerIndex, Coords } from './Types.js';
import { calcRandomMove } from './randomBot.js';

export {
    Board,
    BOARD_DEFAULT_SIZE,
    Game,
    IllegalMove,
    Move,
    calcRandomMove,
};

export type {
    PlayerIndex,
    SpecialMoveType,
    Coords,
};
