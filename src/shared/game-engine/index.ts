import Board, { BOARD_DEFAULT_SIZE } from './Board';
import Game from './Game';
import IllegalMove from './IllegalMove';
import Move, { SpecialMoveType } from './Move';
import { PlayerIndex, Coords } from './Types';
import { calcRandomMove } from './randomBot';

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
