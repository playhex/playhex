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

    /**
     * Clear or set timeout to emit elapse event,
     * should be called after value has been updated.
     */
    private resetElapseTimeout(): void
    {
        const now = new Date();

        if (null !== this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        if (this.value instanceof Date) {
            const elapsesAt = this.value;

            if (this.value > now) {
                // Chrono will elapse at given date
                this.timeout = setTimeout(
                    () => this.emit('elapsed', elapsesAt),
                    this.value.getTime() - now.getTime(),
                );
            } else {
                // Chrono is already elapsed at given date
                this.emit('elapsed', elapsesAt);
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
     */
    setValue(value: TimeValue): void
    {
        this.value = value;

        this.resetElapseTimeout();
    }

    /**
     * Increment or decrement time of this chrono,
     * keeping running/paused state.
     *
     * @param date Used to know if chrono is elapsed from this date after increment
     */
    increment(ms: number): void
    {
        if (this.value instanceof Date) {
            this.value = new Date(this.value.getTime() + ms);
            this.resetElapseTimeout();
        } else {
            this.value += ms;
        }
    }

    /**
     * @param date When exactly chrono has been started. In doubt, pass new Date()
     */
    run(date: Date): void
    {
        if (this.value instanceof Date) {
            return;
        }

        this.value = new Date(date.getTime() + this.value);

        this.resetElapseTimeout();
    }

    /**
     * @param date When exactly chrono has been paused. In doubt, pass new Date()
     */
    pause(date: Date): void
    {
        if (!(this.value instanceof Date)) {
            return;
        }

        this.value = this.value.getTime() - date.getTime();

        this.resetElapseTimeout();
    }

    /**
     * Whether chrono has reached 0 and time is now incrementing.
     * Elapsed event should have been emited,
     * except if an elapsed time has been set manually.
     *
     * @param date For when to check whether chrono is elapsed. In doubt, pass new Date()
     */
    isElapsedAt(date: Date): null | Date
    {
        if (this.value instanceof Date) {
            if (this.value.getTime() <= date.getTime()) {
                return this.value;
            }

            return null;
        }

        if (this.value <= 0) {
            // eslint-disable-next-line no-console
            console.warn('A chrono is elapsed but paused, cannot guess when exactly it has elapsed. Returning an elapsed date from now.');

            return new Date(date.getTime() - this.value);
        }

        return null;
    }

    /**
     * @param date For when to show chrono value. In doubt, pass new Date()
     */
    toString(date: Date): string
    {
        return `${timeValueToMilliseconds(this.value, date)}ms`;
    }
}
