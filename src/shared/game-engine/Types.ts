import { Coords } from '../move-notation/move-notation.js';
import { HexMove } from '../move-notation/hex-move-notation.js';

export type PlayerIndex = 0 | 1;

export type PathItem = {
    parent: null | PathItem;
    cell: Coords;
};

export type TimestampedMove = {
    move: HexMove;
    playedAt: Date;
};

/**
 * How a game has ended.
 */
export type Outcome =
    /**
     * Player who won connected his sides.
     */
    | 'path'

    /**
     * Player who lost manually resigned the game, before or while playing.
     */
    | 'resign'

    /**
     * Player who lost ran out of time while playing.
     * Assuming he already played at least one move.
     */
    | 'time'

    /**
     * Player who lost didn't played his first move,
     * or has been foreited by an external reason.
     */
    | 'forfeit'
;
