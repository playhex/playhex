import TypedEventEmitter from 'typed-emitter';
import { PlayerIndex, TimeControlEvents, TimeControlInterface, TimeControlState, TimeControlValues } from './TimeControlInterface';
import EventEmitter from 'events';

export abstract class AbstractTimeControl
    extends (EventEmitter as unknown as new () => TypedEventEmitter<TimeControlEvents>)
    implements TimeControlInterface
{
    abstract getCurrentPlayer(): PlayerIndex;
    abstract getState(): TimeControlState;
    abstract getValues(): TimeControlValues;
    abstract setValues(values: TimeControlValues): void;
    abstract start(): void;
    abstract pause(): void;
    abstract resume(): void;
    abstract finish(): void;
    abstract push(byPlayer: PlayerIndex): void;
}
