import { TypedEmitter } from 'tiny-typed-emitter';
import TimeValue, { timeValueToSeconds } from './TimeValue';

type ChronoEvents = {
    elapsed: () => void;
};

/**
 * Simple chrono for a single player.
 * Can be started or paused.
 */
export class Chrono extends TypedEmitter<ChronoEvents>
{
    private value: TimeValue;

    private timeout: null | NodeJS.Timeout = null;

    constructor(initialTime = 0)
    {
        super();

        this.value = initialTime;
    }

    private resetTimeout(now?: Date): void
    {
        if (null !== this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        if (this.value instanceof Date) {
            now = now || new Date();

            if (this.value > now) {
                this.timeout = setTimeout(
                    () => this.emit('elapsed'),
                    this.value.getTime() - now.getTime(),
                );
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
     */
    setValue(value: TimeValue): void
    {
        this.value = value;

        this.resetTimeout();
    }

    increment(seconds: number): void
    {
        if (this.value instanceof Date) {
            this.setValue(new Date(this.value.getTime() + seconds * 1000));
        } else {
            this.value += seconds;
        }
    }

    run(): void
    {
        if (this.value instanceof Date) {
            console.error('Chrono.run(): Already running');
            return;
        }

        const now = new Date();

        this.value = new Date(now.getTime() + this.value * 1000);

        this.resetTimeout(now);
    }

    pause(): void
    {
        if (!(this.value instanceof Date)) {
            console.error('Chrono.pause(): Already paused');
            return;
        }

        this.value = (this.value.getTime() - (new Date().getTime())) / 1000;

        this.resetTimeout();
    }

    /**
     * Whether chrono has reached 0 and time is now incrementing.
     * Elapsed event should have been emited,
     * except if an elapsed time has been set manually.
     */
    isElapsed(): boolean
    {
        if (this.value instanceof Date) {
            return this.value.getTime() <= new Date().getTime();
        }

        return this.value <= 0;
    }

    toString(): string
    {
        return `${timeValueToSeconds(this.value)}s`;
    }
}
