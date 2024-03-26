import Board, { BOARD_DEFAULT_SIZE } from './Board';
import Game from './Game';
import IllegalMove from './IllegalMove';
import Move from './Move';
import { PlayerIndex, Outcome } from './Types';
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

export const outcomeToString = (outcome: Outcome): string => {
    switch (outcome) {
        case null: return 'the game';
        case 'resign': return 'by resignation';
        case 'time': return 'by time';
        case 'forfeit': return 'by forfeit';
    }
};
