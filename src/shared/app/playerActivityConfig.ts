/**
 * Consider player inactive after no activity for this time.
 */
export const DELAY_BEFORE_PLAYER_INACTIVE = 5 * 60 * 1000;

/**
 * Client won't notify activity to server more than once every N milliseconds.
 */
export const SEND_ACTIVITY_COOLDOWN = 1 * 60 * 1000;
