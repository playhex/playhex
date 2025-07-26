self.addEventListener('install', () => {
    // noop
});

const CachePolicy = {
    /**
     * Never cache.
     *
     * I.e /socket.io/, as unused offline,
     * and won't block offline navigation on fetch error.
     */
    NETWORK_ONLY: 'network only',

    /**
     * Use network and cache response, or fallback on cache when offline.
     *
     * Used for data that should keep updated when online (games...),
     * but is ok to reuse old data when offline to navigate through application.
     */
    NETWORK_FIRST: 'network first',

    /**
     * Always use cache, even online.
     * If not cached, fetch from network.
     *
     * Used for bundled js (as they have unique filename), images
     */
    CACHE_FIRST: 'cache first',

    /**
     * First returns response from cache,
     * then update if network available.
     *
     * Like CACHE_FIRST, but still update resource for next call.
     */
    CACHE_AND_UPDATE: 'cache and update',
};

/**
 * Whether should cache a response for a request.
 * Returns which cache policy to use for a given request.
 *
 * @param {Request} request
 *
 * @returns {String} One of CACHE_* constants
 */
const getCachePolicy = (request) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
        return CachePolicy.NETWORK_ONLY;
    }

    /**
     * pathname examples: "/", "/socket.io/", "/api/online-players", "/images/logo-transparent.svg", "/statics/vendors-a2...b-bundle.js"
     */
    const { pathname } = new URL(request.url);

    const cachePolicies = [
        [url => url.startsWith('/socket.io/'), CachePolicy.NETWORK_ONLY],
        [url => url === '/pwa-manifest.json', CachePolicy.NETWORK_ONLY],

        [url => url === '/', CachePolicy.NETWORK_FIRST],
        [url => url.startsWith('/api/'), CachePolicy.NETWORK_FIRST],

        [url => url.startsWith('/locales/'), CachePolicy.CACHE_FIRST],
        [url => url.startsWith('/images/'), CachePolicy.CACHE_FIRST],
        [url => url.startsWith('/statics/'), CachePolicy.CACHE_FIRST],
    ];

    for (const [match, cachePolicy] of cachePolicies) {
        if (match(pathname)) {
            return cachePolicy;
        }
    }

    // console.warn('CACHE: Undefined policy for this url, using NETWORK_ONLY cache policy', { pathname });
    return CachePolicy.NETWORK_ONLY;
};

/**
 * @param {Request} request
 * @param {Response} response Should pass a response.clone() instead
 */
const cacheResponse = async (request, response) => {
    if (!response.ok) {
        return;
    }

    const cache = await caches.open('cache');
    cache.put(request, response);
};

/**
 * Retrieve response from network or cache
 * using cache policy.
 *
 * @param {Request} request
 * @param {String} cachePolicy
 *
 * @returns {Promise<{response: Response | undefined, hit: Boolean}>}
 */
const retrieveResponse = async (request, cachePolicy) => {
    switch (cachePolicy) {
        case CachePolicy.NETWORK_ONLY: {
            try {
                return { response: await fetch(request), hit: false };
            } catch (e) {
            }
        }

            break;

        case CachePolicy.NETWORK_FIRST: {
            try {
                const response = await fetch(request);
                cacheResponse(request, response.clone());

                return { response, hit: false };
            } catch (e) {
                const cachedResponse = await caches.match(request);

                if (cachedResponse) {
                    return { response: cachedResponse, hit: true };
                }
            }
        }

            break;

        case CachePolicy.CACHE_FIRST: {
            try {
                const cachedResponse = await caches.match(request);

                if (cachedResponse) {
                    return { response: cachedResponse, hit: true };
                }

                const response = await fetch(request);
                cacheResponse(request, response.clone());

                return { response, hit: false };
            } catch (e) {
            }
        }

            break;

        case CachePolicy.CACHE_AND_UPDATE: {
            try {
                const cachedResponse = await caches.match(request);

                if (cachedResponse) {
                    fetch(request)
                        .then(response => cacheResponse(request, response.clone()))
                        .catch(() => { /* noop, no problem */ })
                    ;

                    return { response: cachedResponse, hit: true };
                }

                const response = await fetch(request);
                cacheResponse(request, response.clone());

                return { response, hit: false };
            } catch (e) {
            }
        }

            break;
    }

    return { response: undefined, hit: false };
};

// Offline handling. Just fallback on cache if no network.
self.addEventListener('fetch', event => {
    event.respondWith((async () => {
        const cachePolicy = getCachePolicy(event.request);
        const result = await retrieveResponse(event.request, cachePolicy);

        // console.log({ cachePolicy, hit: result.hit }, event.request.method, event.request.url);

        return result.response;
    })());
});

self.addEventListener('push', (event) => {
    // src/shared/app/PushPayload.ts
    const {
        body,
        title,
        tag,
        goToPath,
        date,
        lang,
    } = event.data.json();

    event.waitUntil(self.registration.showNotification(title, {
        body,
        icon: '/images/logo-transparent.svg',
        lang,
        tag: tag ?? 'default',
        timestamp: new Date(date).valueOf(),
        data: {
            goToPath,
        },
    }));
});

// Keep track url changes in clients, because client.url is the url when the tab was created.
const clientUpdatedUrls = {};

self.addEventListener('message', (event) => {
    if (event.data?.type === 'ROUTE_UPDATE') {
        clientUpdatedUrls[event.source.id] = event.data.url;
    }
});

/**
 * Delete clients that have been closed to prevent clientUpdatedUrls growing.
 *
 * @param {Client[]} windowClients
 */
const cleanClientUpdatedUrls = windowClients => {
    const stillOpenClientIds = {};

    for (const client of windowClients) {
        stillOpenClientIds[client.id] = true;
    }

    for (const clientId in clientUpdatedUrls) {
        if (!stillOpenClientIds[clientId]) {
            self.console.log('delete', clientId);
            delete clientUpdatedUrls[clientId];
        }
    }
};

// On notification click, navigate to the url.
self.addEventListener('notificationclick', event => {
    const { goToPath } = event.notification.data;
    event.notification.close(); // Android needs explicit close.

    /* global clients */

    event.waitUntil(
        clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(windowClients => {

            cleanClientUpdatedUrls(windowClients);

            // no tab open on the application, just open a new one.
            if (windowClients.length === 0) {
                if (clients.openWindow) {
                    return clients.openWindow(goToPath ?? '/');
                }

                return;
            }

            let focusedClient = null;

            // Check if there is already a window/tab open with the target URL
            for (const client of windowClients) {

                /**
                 * Contains either full url, or relative path of client current url.
                 *
                 * client.url is the absolute url, not only the path.
                 * client.url don't change when url changes with vue.
                 * So it's the first url when tab is created.
                 * It's the expected behaviour according to the spec, but chromium keeps it updated.
                 *
                 * @type {string}
                 */
                const clientUrl = clientUpdatedUrls[client.id] ?? client.url;

                // If so, just focus it.
                if (goToPath !== null && clientUrl.includes(goToPath) && 'focus' in client) {
                    return client.focus();
                }

                if (client.focused) {
                    focusedClient = client;
                }
            }

            // If no focused client, focus to first one
            if (focusedClient === null) {
                focusedClient = windowClients[0];
                focusedClient.focus();
            }

            // navigate to the url in the focused client
            if (goToPath !== null) {
                focusedClient.postMessage({ type: 'NAVIGATE', goToPath });
            }
        }),
    );
});
