/* eslint-disable no-undef */

self.addEventListener('install', () => {
    // noop
});

// Offline handling. Just fallback on cache if no network.
self.addEventListener('fetch', event => {
    event.respondWith((async () => {
        try {
            const res = await fetch(event.request);
            const cache = await caches.open('cache');

            cache.put(event.request.url, res.clone());
            cache.delete()

            return res;
        } catch (error) {
            return caches.match(event.request);
        }
    })());
});

(async () => {
    try {
        const cache = await caches.open('cache');

        console.log('here', await cache.keys());
    } catch (error) {
        console.log({error})
    }
})()
