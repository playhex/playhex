import { TypedEmitter } from 'tiny-typed-emitter';
import { Chrono } from './Chrono';
import TimeValue, { timeValueToSeconds } from './TimeValue';

type ChronoEvents = {
    elapsed: () => void;
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

        this.chrono.on('elapsed', () => {
            if (this.remainingPeriods <= 0) {
                this.emit('elapsed');
                return;
            }

            --this.remainingPeriods;
            this.chrono.increment(this.periodSeconds);
        });
    }

    getMainValue(): TimeValue
    {
        return this.chrono.getValue();
    }

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

    setValues(timeValue: TimeValue, periods: number): void
    {
        this.remainingPeriods = periods;
        this.chrono.setValue(timeValue);

        while (this.chrono.isElapsed() && this.remainingPeriods > 0) {
            --this.remainingPeriods;
            this.chrono.increment(this.periodSeconds);
        }
    }

    setMainValue(value: TimeValue): void
    {
        this.chrono.setValue(value);
    }

    setRemainingPeriods(remainingPeriods: number): void
    {
        this.remainingPeriods = remainingPeriods;
    }

    run(): void
    {
        this.chrono.run();
    }

    pause(): void
    {
        this.chrono.pause();
    }

    /**
     * Must be called instead of pause()
     * to reload time from periods if player elapsed initial time.
     */
    pauseByMovePlayed(): void
    {
        if (this.isInitialTimeElapsed()) {
            this.chrono.setValue(this.periodSeconds);
            return;
        }

        this.chrono.pause();
    }

    /**
     * Whether chrono has reached 0, and there is 0 periods, and time is now incrementing.
     * Elapsed event should have been emited,
     * except if an elapsed time has been set manually.
     */
    isElapsed(): boolean
    {
        return this.chrono.isElapsed() && this.remainingPeriods <= 0;
    }

    toString(): string
    {
        return `${timeValueToSeconds(this.getMainValue())}s + ${this.remainingPeriods} x ${this.periodSeconds}s`;
    }
}
