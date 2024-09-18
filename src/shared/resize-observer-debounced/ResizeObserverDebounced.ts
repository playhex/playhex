const DEFAULT_WAIT = 60 as const;

export const debounceResize = (onResize: () => void, wait: number = DEFAULT_WAIT): () => void => {
    let timeout: null | NodeJS.Timeout = null;
    let shouldCallAfter = false;

    const resetTimeout = () => {
        if (null === timeout) {
            return;
        }

        clearTimeout(timeout);
        timeout = null;
    };

    const startCooldown = () => {
        resetTimeout();

        timeout = setTimeout(() => {
            resetTimeout();

            if (shouldCallAfter) {
                shouldCallAfter = false;
                onResize();
                startCooldown();
            }
        }, wait);
    };

    return () => {
        if (null !== timeout) {
            shouldCallAfter = true;
            return;
        }

        onResize();
        startCooldown();
    };
};

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
