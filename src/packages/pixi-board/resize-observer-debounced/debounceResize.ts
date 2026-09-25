export const DEFAULT_WAIT = 60 as const;

export const debounceResize = (onResize: () => void, wait: number = DEFAULT_WAIT): () => void => {
    let timeout: null | ReturnType<typeof setTimeout> = null;
    let shouldCallAfter = false;

    const resetTimeout = () => {
        if (timeout === null) {
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
        if (timeout !== null) {
            shouldCallAfter = true;
            return;
        }

        onResize();
        startCooldown();
    };
};
