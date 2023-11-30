import EventEmitter from 'events';
import TypedEventEmitter from 'typed-emitter';
import { TimeValue } from './types';

type ChronoEvents = {
    elapsed: () => void;
};

export class Chrono extends (EventEmitter as unknown as new () => TypedEventEmitter<ChronoEvents>)
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
                this.timeout = setTimeout(() => this.emit('elapsed'), this.value.getTime() - now.getTime());
            }
        }
    }

    getValue(): TimeValue
    {
        return this.value;
    }

    setValue(value: TimeValue): void
    {
        this.value = value;

        this.resetTimeout();
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
}
