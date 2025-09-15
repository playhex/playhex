import { TypedEmitter } from 'tiny-typed-emitter';
import TimeValue from './TimeValue.js';
import TimeControlType from './TimeControlType.js';

export type PlayerIndex = 0 | 1;

export type TimeControlEvents = {
    /**
     * @param playerLostByTime Player who get its chrono elapsed
     * @param date When the chrono actually elapsed, can be i.e a slightly past date in case event loop has some lag
     */
    elapsed: (playerLostByTime: PlayerIndex, date: Date) => void;
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
     * Is stopped because Game is finished,
     * 'elapsed' event won't be emitted.
     * Cannot be reused.
     */
    | 'over'
;

export interface PlayerTimeData
{
    /**
     * Time remaing before player lose on time.
     * in milliseconds.
     */
    totalRemainingTime: TimeValue;
}

export interface GameTimeData<T extends PlayerTimeData = PlayerTimeData> {
    state: TimeControlState;
    currentPlayer: PlayerIndex;
    players: [T, T];
}

type ElapsedPlayer = {
    byPlayer: PlayerIndex;
    date: Date;
};

export class TimeControlError extends Error {}

/**
 * Contains a double-clock for two players.
 * Emits "elapsed" event when a player time elapsed.
 */
export abstract class AbstractTimeControl<
    T extends GameTimeData = GameTimeData,
>
    extends TypedEmitter<TimeControlEvents>
{
    protected state: TimeControlState = 'ready';
    protected currentPlayer: PlayerIndex = 0;
    protected elapsedPlayer: null | ElapsedPlayer = null;

    constructor(
        protected options: object,
    ) {
        super();
    }

    getState(): TimeControlState
    {
        return this.state;
    }

    /**
     * Returns current player who is it turn to play,
     * and having its clock elapsing in case time control is running.
     * If time control has not yet started, returns first player.
     * If time control has finished/elapsed, returns last player who have not pushed,
     * or player who have elapsed.
     */
    getCurrentPlayer(): PlayerIndex
    {
        return this.currentPlayer;
    }

    abstract getOptions(): TimeControlType;

    abstract getValues(): T;

    /**
     * @param date When to set dates, used to check if a chrono is already elapsed. In doubt, use new Date()
     */
    abstract setValues(values: T, date: Date): void;

    /**
     * To call from setValues() to update elapsedPlayer
     * and prevent having an elapsed time control
     * but having getStrictElapsedPlayer() failing.
     */
    protected setElapsedPlayerFromValues(values: T, now: Date): void
    {
        if (values.state === 'elapsed') {
            let elapsedAt = values.players[values.currentPlayer].totalRemainingTime;

            if (typeof elapsedAt === 'number') {
                // eslint-disable-next-line no-console
                console.warn('setValues with an elapsed time control values, but unable to get exact elapsed date because chrono was paused. Using "now" date.');

                elapsedAt = now;
            }

            this.elapsedPlayer = {
                byPlayer: values.currentPlayer,
                date: elapsedAt,
            };
        }
    }

    /**
     * @param date When exactly time control has been started. In doubt, use new Date()
     * @param now Set null or same date as "date" to prevent elapsing when working with past dates.
     *            Or set a reference date to use to know whether chrono has elapsed,
     *            or when it will elapse.
     *            Defaults to current system date.
     */
    protected abstract doStart(date: Date, now: null | Date): void;

    /**
     * @param date When exactly time control has been paused. In doubt, use new Date()
     */
    protected abstract doPause(date: Date): void;

    /**
     * @param date When exactly time control has been resumed. In doubt, use new Date()
     * @param now Set null or same date as "date" to prevent elapsing when working with past dates.
     *            Or set a reference date to use to know whether chrono has elapsed,
     *            or when it will elapse.
     *            Defaults to current system date.
     */
    protected abstract doResume(date: Date, now: null | Date): void;

    /**
     * @param date When exactly time control has been finished. In doubt, use new Date()
     */
    protected abstract doFinish(date: Date): void;

    /**
     * @param byPlayer Which player has pushed. Used to check a same player don't push twice.
     * @param date When exactly time control has been pushed. In doubt, use new Date()
     * @param now Set null or same date as "date" to prevent elapsing when working with past dates.
     *            Or set a reference date to use to know whether chrono has elapsed,
     *            or when it will elapse.
     *            Defaults to current system date.
     */
    protected abstract doPush(byPlayer: PlayerIndex, date: Date, now: null | Date): void;

    protected elapse(byPlayer: PlayerIndex, date: Date): void
    {
        if (this.state === 'elapsed') {
            throw new TimeControlError(
                `elapsed() called, but time control already elapsed.`,
            );
        }

        this.state = 'elapsed';
        this.elapsedPlayer = { byPlayer, date };
        this.emit('elapsed', byPlayer, date);
    }

    getStrictElapsedPlayer(): PlayerIndex
    {
        if (this.elapsedPlayer === null) {
            throw new Error('Trying to strictly get elapsed player, but there is not');
        }

        return this.elapsedPlayer.byPlayer;
    }

    getStrictElapsedAt(): Date
    {
        if (this.elapsedPlayer === null) {
            throw new Error('Trying to strictly get elapsed date, but chrono has not elapsed');
        }

        return this.elapsedPlayer.date;
    }

    protected mustBeState(expectedState: TimeControlState): void
    {
        if (this.state !== expectedState) {
            throw new TimeControlError(
                `Must be state "${expectedState}", but currently state "${this.state}".`,
            );
        }
    }

    /**
     * Game starts, first player clock starts elapsing.
     * Useful to bind listeners before starting time control.
     *
     * @param date When exactly time control has been started. In doubt, use new Date()
     * @param now Set null or same date as "date" to prevent elapsing when working with past dates.
     *            Or set a reference date to use to know whether chrono has elapsed,
     *            or when it will elapse.
     *            Defaults to current system date.
     *
     * @throws {TimeControlError} When time control has already been started.
     */
    start(date: Date, now: null | Date = new Date()): void
    {
        this.mustBeState('ready');
        this.doStart(date, now);
        this.state = 'running';
    }

    /**
     * Pause both clocks because players having a break.
     * Call resume() to resume.
     *
     * @param date When exactly time control has been paused. In doubt, use new Date()
     *
     * @throws {TimeControlError} When time control was not running.
     */
    pause(date: Date): void
    {
        this.mustBeState('running');
        this.doPause(date);
        this.state = 'paused';
    }

    /**
     * Resume a pause, players have finished break.
     * Current player's clock will elapsing again.
     *
     * @param date When exactly time control has been resumed. In doubt, use new Date()
     * @param now Set null or same date as "date" to prevent elapsing when working with past dates.
     *            Or set a reference date to use to know whether chrono has elapsed,
     *            or when it will elapse.
     *            Defaults to current system date.
     *
     * @throws {TimeControlError} When time control was not paused.
     */
    resume(date: Date, now: null | Date = new Date()): void
    {
        this.mustBeState('paused');
        this.doResume(date, now);
        this.state = 'running';
    }

    /**
     * Finish time control, because game has finished, or canceled...
     * Clocks will be paused forever, "elapsed" event won't be emitted.
     *
     * @param date When exactly time control has finished. In doubt, use new Date()
     */
    finish(date: Date): void
    {
        this.doFinish(date);
        this.state = 'over';
    }

    /**
     * A player moved and push to pause its clock and resume its opponent clock.
     *
     * @param byPlayer Which player has pushed. Used to check a same player don't push twice.
     * @param date When exactly time control has been pushed. In doubt, use new Date()
     * @param now Set null or same date as "date" to prevent elapsing when working with past dates.
     *            Or set a reference date to use to know whether chrono has elapsed,
     *            or when it will elapse.
     *            Defaults to current system date.
     *
     * @throws {TimeControlError} When a same player push twice.
     * @throws {TimeControlError} When pushing but time control is not running.
     */
    push(byPlayer: PlayerIndex, date: Date, now: null | Date = new Date()): void
    {
        this.mustBeState('running');

        if (this.currentPlayer !== byPlayer) {
            throw new TimeControlError(`Player ${byPlayer} pushed twice.`);
        }

        this.doPush(byPlayer, date, now);
    }

    /**
     * For debug purpose.
     *
     * @param date When exactly you look at time control clocks. In doubt, use new Date()
     */
    override toString(date: Date): string
    {
        return `TimeControl, state: ${this.state}, currentPlayer: ${this.currentPlayer} (at date ${date.toISOString()})`;
    }
}
