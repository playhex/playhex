import { TypedEmitter } from 'tiny-typed-emitter';
import { Chrono } from './Chrono.js';
import TimeValue, { timeValueToMilliseconds } from './TimeValue.js';

type ChronoEvents = {
    /**
     * @param date When the chrono actually elapsed, can be i.e a slightly past date in case event loop has some lag
     */
    elapsed: (date: Date) => void;
};

/**
 * ByoYomi chrono for a single player.
 * Can be started or paused.
 *
 * Unlike Chrono, this ByoYomiChrono won't continue elapsing in negative values.
 */
export class ByoYomiChrono extends TypedEmitter<ChronoEvents>
{
    /**
     * Main chrono, from initial time or reloaded by period.
     */
    private chrono: Chrono;

    /**
     * Remaining byoyomi periods, initialized by periodsCount.
     */
    private remainingPeriods: number;

    /**
     * @param initialTime Time in ms of the initial time before periods.
     * @param periodTime Time in ms of a single period.
     * @param periodsCount Number of periods.
     */
    constructor(
        initialTime: number,
        private periodTime: number,
        private periodsCount: number,
    ) {
        super();

        this.chrono = new Chrono(initialTime);
        this.remainingPeriods = periodsCount;

        this.chrono.on('elapsed', date => {
            if (this.remainingPeriods <= 0) {
                this.emit('elapsed', date);
                this.setMainValue(0);
                return;
            }

            --this.remainingPeriods;
            this.chrono.increment(this.periodTime);
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
            return new Date(mainValue.getTime() + this.remainingPeriods * this.periodTime);
        }

        return mainValue + this.remainingPeriods * this.periodTime;
    }

    getRemainingPeriods(): number
    {
        return this.remainingPeriods;
    }

    setValues(timeValue: TimeValue, periods: number, now: Date = new Date()): void
    {
        this.remainingPeriods = periods;
        this.chrono.setValue(timeValue);

        while (this.chrono.isElapsedAt(now) && this.remainingPeriods > 0) {
            --this.remainingPeriods;
            this.chrono.increment(this.periodTime);
        }
    }

    /**
     * Set time of the chrono, can be the initial time or period time.
     *
     * @param value Value to set, either a date of an elapsing chrono, or a number of milliseconds for a paused chrono.
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

    /**
     * Start/restart chrono, make it elapsing.
     * Can emit elapsed event if chrono restarted from a date that make it already elapsed now.
     *
     * @param date When exactly chrono has been started. In doubt, use new Date()
     * @param now Set null or same date as "date" to prevent elapsing when working with past dates.
     *            Or set a reference date to use to know whether chrono has elapsed,
     *            or when it will elapse.
     *            Defaults to current system date.
     */
    run(date: Date, now: null | Date = new Date()): void
    {
        this.chrono.run(date, now);
    }

    /**
     * Pause chrono.
     * Consumes periods if paused at a date after main chrono elapses.
     * Can emit elapsed event if no remaining periods and main chrono elapses.
     *
     * @param date When exactly chrono has been paused. In doubt, use new Date()
     */
    pause(date: Date): void
    {
        let remaining = timeValueToMilliseconds(this.chrono.getValue(), date);

        while (remaining <= 0 && this.remainingPeriods > 0) {
            remaining += this.periodTime;
            --this.remainingPeriods;
            this.chrono.increment(this.periodTime, null);
        }

        this.chrono.pause(date);
    }

    /**
     * Must be called instead of pause()
     * to reload time from periods if player elapsed initial time.
     * Can emit elapsed event if paused at a date when chrono already have elapsed.
     */
    pauseByMovePlayed(date: Date): void
    {
        this.pause(date);

        // Do not increment if paused after having elapsed
        if (this.remainingPeriods <= 0 && this.chrono.isElapsedAt(date)) {
            return;
        }

        // No increment while still on main time
        if (this.remainingPeriods === this.periodsCount) {
            return;
        }

        this.chrono.setValue(this.periodTime);
    }

    /**
     * @param date For when to show chrono value. In doubt, use new Date()
     */
    override toString(date: Date): string
    {
        return `${timeValueToMilliseconds(this.getMainValue(), date)}ms + ${this.remainingPeriods} x ${this.periodTime}ms (${this.getMainValue() instanceof Date ? 'elapsing' : 'paused'})`;
    }
}
