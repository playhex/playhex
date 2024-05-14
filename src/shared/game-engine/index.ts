import Board, { BOARD_DEFAULT_SIZE } from './Board';
import Game from './Game';
import IllegalMove from './IllegalMove';
import Move from './Move';
import { PlayerIndex } from './Types';
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
};
