import { TypedEmitter } from 'tiny-typed-emitter';
import { Chrono } from './Chrono';
import TimeValue, { timeValueToSeconds } from './TimeValue';

type ChronoEvents = {
    /**
     * @param date When the chrono actually elapsed, can be i.e a slightly past date in case event loop has some lag
     */
    elapsed: (date: Date) => void;
};

/**
 * ByoYomi chrono for a single player.
 * Can be started or paused.
 */
export class ByoYomiChrono extends TypedEmitter<ChronoEvents>
{
    private chrono: Chrono;
    private remainingPeriods: number;

    constructor(
        initialSeconds: number,
        private periodSeconds: number,
        private periodsCount: number,
    ) {
        super();

        this.chrono = new Chrono(initialSeconds);
        this.remainingPeriods = periodsCount;

        this.chrono.on('elapsed', date => {
            if (this.remainingPeriods <= 0) {
                this.emit('elapsed', date);
                return;
            }

            --this.remainingPeriods;
            this.chrono.increment(this.periodSeconds);
        });
    }

    /**
     * Returns main chrono time value,
     * without counting periods.
     * Can be initial time, or current period time if initial time has elapsed.
     */
    getMainValue(): TimeValue
    {
        return this.chrono.getValue();
    }

    /**
     * Returns total time counting periods.
     * Can be a number of time before byo yomi chrono elapses,
     * or the date when all periods are consumed and the byo yomi elapses.
     */
    getTotalValue(): TimeValue
    {
        const mainValue = this.chrono.getValue();

        if (mainValue instanceof Date) {
            return new Date(mainValue.getTime() + this.remainingPeriods * this.periodSeconds * 1000);
        }

        return mainValue + this.remainingPeriods * this.periodSeconds;
    }

    getRemainingPeriods(): number
    {
        return this.remainingPeriods;
    }

    isInitialTimeElapsed(): boolean
    {
        return this.remainingPeriods < this.periodsCount;
    }

    setValues(timeValue: TimeValue, periods: number, date: Date): void
    {
        this.remainingPeriods = periods;
        this.chrono.setValue(timeValue);

        while (this.chrono.isElapsedAt(date) && this.remainingPeriods > 0) {
            --this.remainingPeriods;
            this.chrono.increment(this.periodSeconds);
        }
    }

    /**
     * Set time of the chrono, can be the initial time or period time.
     *
     * @param value Value to set, either a date of an elapsing chrono, or a number of seconds for a paused chrono.
     * @param date Will chech whether chrono is elapsed from this time. Pass new Date() in case of doubt.
     */
    setMainValue(value: TimeValue): void
    {
        this.chrono.setValue(value);
    }

    setRemainingPeriods(remainingPeriods: number): void
    {
        this.remainingPeriods = remainingPeriods;
    }

    run(date: Date): void
    {
        this.chrono.run(date);
    }

    pause(date: Date): void
    {
        this.chrono.pause(date);
    }

    /**
     * Must be called instead of pause()
     * to reload time from periods if player elapsed initial time.
     */
    pauseByMovePlayed(date: Date): void
    {
        if (this.isInitialTimeElapsed()) {
            this.chrono.setValue(this.periodSeconds);
            return;
        }

        this.chrono.pause(date);
    }

    /**
     * Whether chrono has reached 0, and there is 0 periods, and time is now incrementing.
     * Elapsed event should have been emited,
     * except if an elapsed time has been set manually.
     */
    isElapsedAt(date: Date): null | Date
    {
        const elapsesAt = this.getTotalValue();

        if (elapsesAt instanceof Date) {
            if (elapsesAt.getTime() < date.getTime()) {
                return elapsesAt;
            }

            return null;
        }

        return null;
    }

    toString(date: Date): string
    {
        return `${timeValueToSeconds(this.getMainValue(), date)}s + ${this.remainingPeriods} x ${this.periodSeconds}s`;
    }
}
