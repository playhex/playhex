import { TimestampedMove, Outcome, PlayerIndex } from './Types.js';

export type GameData = {
    size: number;
    movesHistory: TimestampedMove[];
    allowSwap: boolean;
    currentPlayerIndex: PlayerIndex;
    winner: null | PlayerIndex;
    outcome: null | Outcome;
    startedAt: Date;
    lastMoveAt: null | Date;
    endedAt: null | Date;
};


