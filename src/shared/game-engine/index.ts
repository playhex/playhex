import Board, { BOARD_DEFAULT_SIZE } from './Board';
import EngineGame from './Game';
import IllegalMove from './IllegalMove';
import Move, { SpecialMoveType } from './Move';
import { PlayerIndex, Coords } from './Types';
import { calcRandomMove } from './randomBot';

export {
    Board,
    BOARD_DEFAULT_SIZE,
    EngineGame as Game,
    IllegalMove,
    Move,
    calcRandomMove,
};

export type {
    PlayerIndex,
    SpecialMoveType,
    Coords,
};
