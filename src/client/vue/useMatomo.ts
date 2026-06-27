import { App } from 'vue';
import router from './router.js';
import VueMatomoRaw from 'vue-matomo';

// Rolldown (Vite 8) CJS interop: vue-matomo sets __esModule non-enumerably so Rolldown
// doesn't detect it and returns the whole module object instead of the default export.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VueMatomo = typeof VueMatomoRaw === 'function' ? VueMatomoRaw : (VueMatomoRaw as any).default;

const useMatomo = (app: App): void => {
    const host = MATOMO_SRC;
    const siteId = MATOMO_WEBSITE_ID;

    if (!host || !siteId) {
        return;
    }

    // See full reference: https://github.com/AmazingDreams/vue-matomo
    app.use(VueMatomo, {
        host,
        siteId,
        router,
    });
};

export default useMatomo;
