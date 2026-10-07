import { GameData } from '../../../../shared/game-engine/normalization.js';
import { PlayerIndex } from '../../../../shared/game-engine/index.js';
import { GameTimeData } from '../../../../shared/time-control/TimeControl.js';
import { Local1v1GameOptions } from './Local1v1GameOptions.js';

export type Seat = 0 | 1;

/**
 * Actions a player can currently do, displayed in menu.
 */
export type LocalPlayerActions = {
    seat: Seat;
    name: string;
    playerIndex: PlayerIndex;
    canUndo: boolean;
    canPass: boolean;
    canResign: boolean;
};

/**
 * A local game between two humans on the same device.
 */
export class Local1v1Game
{
    gameOptions: Local1v1GameOptions;

    gameData: GameData;

    /**
     * Players names by physical seat:
     * 0 is at bottom of the screen, 1 is at top.
     */
    seats: [string, string];

    /**
     * Which seat plays red (first player).
     * Switched on rematch, so players keep their seat but swap colors.
     */
    redSeat: Seat = 0;

    timeControlValues: null | GameTimeData = null;

    /**
     * Player who lost on time. Game is not stopped,
     * players can continue playing until a player connects his sides.
     */
    timeoutLoser: null | PlayerIndex = null;
}
