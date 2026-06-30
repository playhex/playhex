import '../shared/app/i18n/index.js';
// Bootstrap CSS is loaded (and swapped LTR/RTL) at runtime by i18n/index.ts, depending on the locale.
import 'bootstrap/js/src/collapse.js';
import 'bootstrap/js/src/offcanvas.js';
import './base.styl';

import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { createHead } from '@unhead/vue/client';
import App from './vue/App.vue';
import router from './vue/router.js';
import unoverlay from '@overlastic/vue';
import usePlayerLocalSettingsStore from './stores/playerLocalSettingsStore.js';
import I18NextVue from 'i18next-vue';
import i18next from 'i18next';
import useMatomo from './vue/useMatomo.js';
import './services/registerServiceWorker.js';
import './services/playerActivity.js';
import { preloadAssets } from './services/preload-assets.js';
import './services/notifications/index.js';

const pinia = createPinia();

const vueApp = createApp(App);
vueApp.use(router);
vueApp.use(pinia);
vueApp.use(I18NextVue, { i18next });
vueApp.use(unoverlay);
vueApp.use(createHead());

useMatomo(vueApp);

// Load store now to set dark/light theme early enough and prevent blinking
usePlayerLocalSettingsStore();

void preloadAssets();

vueApp.mount('#vue-app');
