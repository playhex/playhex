export const DEFAULT_WAIT = 60 as const;

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
