import { defineStore, storeToRefs } from 'pinia';
import useSocketStore from '../../../stores/socketStore.js';
import { ref, watch } from 'vue';

/**
 * Provides shouldDisplayPlayOffline,
 * a ref that is true when connection is lost to server,
 * but with a delay.
 *
 * Used to know when displaying "Connection lost? Play offline" link.
 */
export const useConnectionLostPlayOfflineStore = defineStore('connectionLostPlayOfflineStore', () => {
    const { connected } = storeToRefs(useSocketStore());

    const shouldDisplayPlayOffline = ref(false);

    let timeout: null | NodeJS.Timeout = null;

    const delayBeforeDisplayMs = 1500;

    const resetTimeout = () => {
        if (!timeout) {
            return;
        }

        clearTimeout(timeout);
        timeout = null;
    };

    const displayDeferred = () => {
        if (timeout) {
            return;
        }

        timeout = setTimeout(() => {
            shouldDisplayPlayOffline.value = true;
            resetTimeout();
        }, delayBeforeDisplayMs);
    };

    watch(connected, connected => {
        if (!connected) {
            displayDeferred();
            return;
        }

        shouldDisplayPlayOffline.value = false;

        if (timeout) {
            resetTimeout();
        }
    });

    if (!connected.value) {
        displayDeferred();
    }

    return {
        shouldDisplayPlayOffline,
    };
});
