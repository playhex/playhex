/**
 * Debounce function specialized for redraw pixi container in ResizeObserver.
 *
 * Will call redraw instantly in case container was resized once, i.e sidebar closed,
 * then will call redraw once every wait-time while resizing, i.e player resizing its window.
 */
export const debounceRedraw = (redrawCallback: () => void, wait = 60): () => void => {
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
                redrawCallback();
                startCooldown();
            }
        }, wait);
    };

    return () => {
        if (null !== timeout) {
            shouldCallAfter = true;
            return;
        }

        redrawCallback();
        startCooldown();
    };
};
