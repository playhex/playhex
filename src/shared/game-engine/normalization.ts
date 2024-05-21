import { Outcome, PlayerIndex } from './Types';

/*
 * Used to transform a game instance to a plain object
 * that can be send as json, and transformed back to a game instance.
 *
 * See Game.toData() and Game.fromData()
 */

export type MoveData = {
    row: number;
    col: number;
    playedAt: Date;
};

export type GameData = {
    size: number;
    movesHistory: MoveData[];
    allowSwap: boolean;
    currentPlayerIndex: PlayerIndex;
    winner: null | PlayerIndex;
    outcome: null | Outcome;
    startedAt: Date;
    lastMoveAt: null | Date;
    endedAt: null | Date;
};


