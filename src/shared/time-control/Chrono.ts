import { TypedEmitter } from 'tiny-typed-emitter';
import TimeValue, { timeValueToMilliseconds } from './TimeValue';

type ChronoEvents = {
    /**
     * @param date When the chrono actually elapsed, can be i.e a slightly past date in case event loop has some lag
     */
    elapsed: (date: Date) => void;
};

/**
 * Simple chrono for a single player.
 * Can be started or paused.
 * Uses strict timestamps, so need to pass the exact "now" date to each method. Pass "new Date()" if you don't need strict timestamps.
 * On elapse, time continues increasing, not pausing at 0.
 */
export class Chrono extends TypedEmitter<ChronoEvents>
{
    private value: TimeValue;

    private timeout: null | NodeJS.Timeout = null;

    constructor(initialTimeValue: TimeValue = 0)
    {
        super();

        this.value = initialTimeValue;
    }

    isRunning(): boolean
    {
        return this.value instanceof Date;
    }

    private clearElapseTimeout(): void
    {
        if (null !== this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    /**
     * Clear or set timeout to emit elapse event,
     * should be called after value has been updated.
     *
     * "elapsed" event will only be emitted if chrono is currently elapsing.
     * When paused, it will only clear timeout if any.
     *
     * @param now Set null or same date as "date" to prevent elapsing when working with past dates.
     *            Or set a reference date to use to know whether chrono has elapsed,
     *            or when it will elapse.
     *            Defaults to current system date.
     */
    private resetElapseTimeout(now: null | Date = new Date()): void
    {
        this.clearElapseTimeout();

        if (null !== now && this.value instanceof Date) {
            if (this.value > now) {
                // Chrono will elapse at given date
                const elapsesAt = this.value;

                this.timeout = setTimeout(
                    () => this.emit('elapsed', elapsesAt),
                    this.value.getTime() - now.getTime(),
                );
            } else {
                // Chrono is already elapsed at given date
                this.emit('elapsed', this.value);
            }
        }
    }

    getValue(): TimeValue
    {
        return this.value;
    }

    /**
     * Set raw value of chrono.
     *
     * Careful: if setting a number while chrono is running,
     * it will pause the chrono because a number is for a paused value.
     *
     * Same when setting a Date on a paused Chrono, it will go on a running state.
     *
     * @param date In case of setting a date, will check if chrono is elapsed from this date.
     * @param now Set null or same date as "date" to prevent elapsing when working with past dates.
     *            Or set a reference date to use to know whether chrono has elapsed,
     *            or when it will elapse.
     *            Defaults to current system date.
     */
    setValue(value: TimeValue, now: null | Date = new Date()): void
    {
        this.value = value;

        this.resetElapseTimeout(now);
    }

    /**
     * Increment or decrement time of this chrono,
     * keeping running/paused state.
     * When decrementing, can emit elapsed event if chrono is running and goes negative.
     *
     * @param ms Number of milliseconds to add
     * @param now Set null or same date as "date" to prevent elapsing when working with past dates.
     *            Or set a reference date to use to know whether chrono has elapsed,
     *            or when it will elapse.
     *            Defaults to current system date.
     */
    increment(ms: number, now: null | Date = new Date()): void
    {
        if (this.value instanceof Date) {
            this.value = new Date(this.value.getTime() + ms);
            this.resetElapseTimeout(now);
        } else {
            this.value += ms;
        }
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
        if (this.value instanceof Date) {
            return;
        }

        this.value = new Date(date.getTime() + this.value);

        this.resetElapseTimeout(now);
    }

    /**
     * Pause chrono.
     * Can emit elapsed event if paused at a date when chrono already have elapsed.
     *
     * @param date When exactly chrono has been paused. In doubt, use new Date()
     */
    pause(date: Date): void
    {
        if (!(this.value instanceof Date)) {
            return;
        }

        const elapsedAt = this.getElapsedAt(date);

        this.value = this.value.getTime() - date.getTime();

        this.clearElapseTimeout();

        if (null !== elapsedAt) {
            // emit after all internal changes because listeners may update chrono
            this.emit('elapsed', elapsedAt);
        }
    }

    private getElapsedAtDate(now: Date): null | { date: Date, safeDate: boolean }
    {
        if (this.value instanceof Date) {
            if (this.value.getTime() <= now.getTime()) {
                return {
                    date: this.value,
                    safeDate: true,
                };
            }

            return null;
        }

        if (this.value <= 0) {
            return {
                date: new Date(now.getTime() - this.value),
                safeDate: false, // Cannot know exactly when chrono has elapsed, date should not be used.
            };
        }

        return null;
    }

    /**
     * Whether chrono has reached 0 and time is now incrementing.
     *
     * @param now Set null or same date as "date" to prevent elapsing when working with past dates.
     *            Or set a reference date to use to know whether chrono has elapsed,
     *            or when it will elapse.
     *            Defaults to current system date.
     */
    isElapsedAt(now: Date = new Date()): boolean
    {
        return null !== this.getElapsedAtDate(now);
    }

    /**
     * Whether chrono has reached 0 and time is now incrementing.
     * Can log a warning when trying to get elapsed date when chrono is paused AND elapsed.
     * In this case, it is impossible to know when exactly chrono has elapsed,
     * so date in return value should not be used.
     * Use isElapsedAt() if you only need to check elapsed or not, and prevent warning.
     *
     * @param now Set null or same date as "date" to prevent elapsing when working with past dates.
     *            Or set a reference date to use to know whether chrono has elapsed,
     *            or when it will elapse.
     *            Defaults to current system date.
     *
     * @returns null if not elapsed, or Date when chrono has actually elapsed
     */
    getElapsedAt(now: Date = new Date()): null | Date
    {
        const at = this.getElapsedAtDate(now);

        if (null === at) {
            return null;
        }

        if (!at.safeDate) {
            // eslint-disable-next-line no-console
            console.warn('A chrono is elapsed but paused, cannot guess when exactly it has elapsed. Returning an elapsed date from now. If you only check id date is null or not, use isElapsedAt()');
        }

        return at.date;
    }

    /**
     * @param date For when to show chrono value. In doubt, use new Date()
     */
    override toString(date: Date): string
    {
        return `${timeValueToMilliseconds(this.value, date)}ms (${this.isRunning() ? 'elapsing' : 'paused'})`;
    }
}
