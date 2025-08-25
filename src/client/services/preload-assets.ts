/**
 * Preload assets to store them in cache,
 * so that service worker can serve them even when offline.
 */
export const preloadAssets = async () => {
    await import('../vue/offline-lobby/pages/PageOfflineLobby.vue');
    await import('../vue/offline-lobby/pages/PagePlayOffline.vue');
};
