export type PlayerIndex = 0 | 1;

/**
 * Row is number
 * Col is letter
 */
export type Coords = {
    row: number;
    col: number;
};

export type PathItem = {
    parent: null | PathItem;
    cell: Coords;
};

/**
 * How a game has ended.
 */
export type Outcome =
    /**
     * No outcome precision, game is still playing, or has been canceled.
     */
    null

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
