import { nextTick, onBeforeUnmount, watch, ref, type Ref } from 'vue';

/**
 * Distance in pixels from the bottom under which we consider
 * the user is still reading the last messages.
 */
const THRESHOLD = 60;

/**
 * Keeps a scrollable element (chat messages list) scrolled to bottom
 * when new content is added, but only while the user has not scrolled up
 * to read older messages.
 *
 * Whether we should stick to bottom is tracked from actual "scroll" events
 * instead of being measured when new content arrives: measuring at that
 * moment is unreliable, the element may have already been re-rendered,
 * or not be displayed at all.
 */
export const useStickToBottom = (element: Ref<HTMLElement | undefined | null>) => {
    const stickToBottom = ref(true);

    const distanceFromBottom = (el: HTMLElement): number => el.scrollHeight - el.scrollTop - el.clientHeight;

    /**
     * An element which is hidden (collapsed sidebar, inactive tab...) has a null clientHeight,
     * and reports a meaningless scroll position: must not be taken into account.
     */
    const isMeasurable = (el: HTMLElement): boolean => el.clientHeight > 0;

    const scrollToBottom = (): void => {
        stickToBottom.value = true;

        void nextTick(() => {
            const el = element.value;

            if (!el) {
                return;
            }

            el.scrollTop = el.scrollHeight;
        });
    };

    /**
     * Must be called when new messages have been added.
     */
    const contentChanged = (): void => {
        if (!stickToBottom.value) {
            return;
        }

        scrollToBottom();
    };

    const onScroll = (): void => {
        const el = element.value;

        if (!el || !isMeasurable(el)) {
            return;
        }

        stickToBottom.value = distanceFromBottom(el) <= THRESHOLD;
    };

    // Element getting resized (window resize, mobile keyboard opening, sidebar layout...)
    // must not unstick from bottom.
    const resizeObserver = typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => contentChanged())
        : null
    ;

    watch(element, (el, previousEl) => {
        if (previousEl) {
            previousEl.removeEventListener('scroll', onScroll);
            resizeObserver?.unobserve(previousEl);
        }

        if (el) {
            el.addEventListener('scroll', onScroll, { passive: true });
            resizeObserver?.observe(el);
            scrollToBottom();
        }
    }, { immediate: true, flush: 'post' });

    onBeforeUnmount(() => {
        element.value?.removeEventListener('scroll', onScroll);
        resizeObserver?.disconnect();
    });

    return {
        stickToBottom,
        scrollToBottom,
        contentChanged,
    };
};
