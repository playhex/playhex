import { TypedEmitter } from 'tiny-typed-emitter';
import TimeValue from './TimeValue';
import TimeControlType from './TimeControlType';

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
     * Time remaing before player lose by time.
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

    protected abstract doStart(date: Date): void;
    protected abstract doPause(date: Date): void;
    protected abstract doResume(date: Date): void;
    protected abstract doFinish(date: Date): void;
    protected abstract doPush(byPlayer: PlayerIndex, date: Date): void;

    protected elapse(byPlayer: PlayerIndex, date: Date): void
    {
        if ('elapsed' === this.state) {
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
        if (null === this.elapsedPlayer) {
            throw new Error('Trying to strictly get elapsed player, but there is not');
        }

        return this.elapsedPlayer.byPlayer;
    }

    getStrictElapsedAt(): Date
    {
        if (null === this.elapsedPlayer) {
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

    start(date: Date): void
    {
        this.mustBeState('ready');
        this.doStart(date);
        this.state = 'running';
    }

    pause(date: Date): void
    {
        this.mustBeState('running');
        this.doPause(date);
        this.state = 'paused';
    }

    resume(date: Date): void
    {
        this.mustBeState('paused');
        this.doResume(date);
        this.state = 'running';
    }

    finish(date: Date): void
    {
        this.doFinish(date);
        this.state = 'over';
    }

    push(byPlayer: PlayerIndex, date: Date): void
    {
        this.mustBeState('running');

        if (this.currentPlayer !== byPlayer) {
            throw new TimeControlError(`Player ${byPlayer} pushed twice.`);
        }

        this.doPush(byPlayer, date);
    }
}
