import { debounceResize, DEFAULT_WAIT } from './debounceResize';

/**
 * Same as ResizeObserver, but debounced:
 * will be called instantly on first event,
 * then once every wait-time if element was resized at least once during last wait-time.
 */
export class ResizeObserverDebounced extends ResizeObserver
{
    constructor(callback: () => void, wait = DEFAULT_WAIT)
    {
        super(debounceResize(callback, wait));
    }
}
