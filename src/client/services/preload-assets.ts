/**
 * Preload assets to store them in cache,
 * so that service worker can serve them even when offline.
 *
 * Waits for page load and browser idle time
 * to not compete with current page assets.
 */
export const preloadAssets = async () => {
    if (document.readyState !== 'complete') {
        await new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
    }

    if ('requestIdleCallback' in window) {
        await new Promise(resolve => requestIdleCallback(resolve, { timeout: 5000 }));
    }

    await import('../vue/offline-lobby/pages/PageOfflineLobby.vue');
    await import('../vue/offline-lobby/pages/PagePlayOffline.vue');
    await import('../vue/offline-lobby/pages/PagePlayLocal1v1.vue');
    await import('../vue/offline-lobby/pages/PageLocalGameReview.vue');
};
