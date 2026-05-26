import { App } from 'vue';
import router from './router.js';
import VueMatomo from 'vue-matomo';

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
