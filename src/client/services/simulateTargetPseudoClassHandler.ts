const pseudoTargetClass = 'pseudo-target' as const;

/**
 * :target in css seems not (always?) working in vue component, so need this workaround.
 * Adds a class on element having ":target" selector, so in css, needs to target like:
 *
 * ```
 * :target, .pseudo-target { ... }
 * ```
 *
 * And add in component script:
 *
 * ```
 * onMounted(() => {
 *     simulateTargetPseudoClassHandler();
 *     window.addEventListener('hashchange', simulateTargetPseudoClassHandler);
 * });
 *
 * onUnmounted(() => {
 *     window.removeEventListener('hashchange', simulateTargetPseudoClassHandler);
 * });
 * ```
 */
export const simulateTargetPseudoClassHandler = () => {
    document.querySelectorAll('.' + pseudoTargetClass).forEach(e => e.classList.remove(pseudoTargetClass));

    const hash = window?.location?.hash;

    if (!hash) {
        return;
    }

    const targetedHashId = decodeURIComponent(hash);
    const element = document.querySelector(targetedHashId);

    if (!element) {
        return;
    }

    element.classList.add(pseudoTargetClass);
};
