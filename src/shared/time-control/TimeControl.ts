import TypedEventEmitter from 'typed-emitter';
import EventEmitter from 'events';
import TimeValue from './TimeValue';
import TimeControlType from './TimeControlType';

export type PlayerIndex = 0 | 1;

export type TimeControlEvents = {
    elapsed: (playerLostByTime: PlayerIndex) => void;
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

export class TimeControlError extends Error {}

/**
 * Contains a double-clock for two players.
 * Emits "elapsed" event when a player time elapsed.
 */
export abstract class AbstractTimeControl<
    T extends GameTimeData = GameTimeData,
>
    extends (EventEmitter as unknown as new () => TypedEventEmitter<TimeControlEvents>)
{
    protected state: TimeControlState = 'ready';
    protected currentPlayer: PlayerIndex = 0;

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
    abstract setValues(values: T): void;

    protected abstract doStart(): void;
    protected abstract doPause(): void;
    protected abstract doResume(): void;
    protected abstract doFinish(): void;
    protected abstract doPush(byPlayer: PlayerIndex): void;

    protected elapse(byPlayer: PlayerIndex): void
    {
        if ('elapsed' === this.state) {
            throw new TimeControlError(
                `elapsed() called, but time control already elapsed.`,
            );
        }

        this.state = 'elapsed';
        this.emit('elapsed', byPlayer);
    }

    protected mustBeState(expectedState: TimeControlState): void
    {
        if (this.state !== expectedState) {
            throw new TimeControlError(
                `Must be state "${expectedState}", but currently state "${this.state}".`,
            );
        }
    }

    start(): void
    {
        this.mustBeState('ready');
        this.doStart();
        this.state = 'running';
    }

    pause(): void
    {
        this.mustBeState('running');
        this.doPause();
        this.state = 'paused';
    }

    resume(): void
    {
        this.mustBeState('paused');
        this.doResume();
        this.state = 'running';
    }

    finish(): void
    {
        this.doFinish();
        this.state = 'over';
    }

    push(byPlayer: PlayerIndex): void
    {
        this.mustBeState('running');

        if (this.currentPlayer !== byPlayer) {
            throw new TimeControlError(`Player ${byPlayer} pushed twice.`);
        }

        this.doPush(byPlayer);
    }
}
