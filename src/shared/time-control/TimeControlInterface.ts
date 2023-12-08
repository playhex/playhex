import TypedEventEmitter from 'typed-emitter';

export type PlayerIndex = 0 | 1;

export type TimeControlEvents = {
    elapsed: (playerLostByTime: PlayerIndex) => void;
};

/**
 * Time data to be displayed on chrono.
 *
 * Depending whether time is running or paused:
 * - number: paused chrono
 * - date: running chrono, date when chrono reaches 0:00.
 *
 * Depending whether time is countdown or incrementing:
 * - positive number/future date: countdown timer.
 * - negative number/past date: time is incrementing.
 */
export type TimeValue = Date | number;

export const timeValueToSeconds = (timeValue: TimeValue): number => {
    return timeValue instanceof Date
        ? (timeValue.getTime() - new Date().getTime()) / 1000
        : timeValue
    ;
};

export type TimeControlState =
    /**
     * Has been created, and is not yet started.
     */
    'ready'

    /**
     * Is elapsing for a player.
     */
    | 'running'

    /**
     * Is paused, both players having a break.
     */
    | 'paused'

    /**
     * A player has ran out of time,
     * 'elapsed' event has been emitted with the player who lost as argument.
     */
    | 'elapsed'

    /**
     * Is stopped because Game is over,
     * 'elapsed' event won't be emitted.
     * Cannot be reused.
     */
    | 'over'
;

export type TimeControlValue = {
    /**
     * Time remaing before player lose by time.
     */
    totalRemainingTime: TimeValue;
};

export type TimeControlValues<T extends TimeControlValue = TimeControlValue> = {
    type: string;
    state: TimeControlState;
    players: [T, T];
};

export class TimeControlError extends Error {}

export interface TimeControlInterface<T extends TimeControlValue = TimeControlValue>
    extends TypedEventEmitter<TimeControlEvents>
{
    getCurrentPlayer(): PlayerIndex;

    getState(): TimeControlState;

    /**
     * Returns clock data for both players
     */
    getValues(): TimeControlValues<T>;

    /**
     * Update time control for both players
     */
    setValues(values: TimeControlValues<T>): void;

    start(): void;

    /**
     * Switch current player
     */
    push(byPlayer: PlayerIndex): void;

    pause(): void;

    resume(): void;

    /**
     * Stop time control when not needed anymore, won't emit 'elapsed' event.
     */
    finish(): void;
}
