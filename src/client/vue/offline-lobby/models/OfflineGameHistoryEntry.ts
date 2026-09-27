import { GameData } from '../../../../shared/game-engine/normalization.js';
import { PlayerIndex } from '../../../../shared/game-engine/index.js';

/**
 * A finished local game, kept in history.
 */
export type OfflineGameHistoryEntry = {
    /**
     * Players pseudos, indexed by color (0 = red, first player).
     */
    pseudos: [string, string];

    gameData: GameData;

    /**
     * Local 1v1 games only: player who lost on time,
     * but game has continued until a player connected his sides.
     */
    timeoutLoser?: null | PlayerIndex;
};
