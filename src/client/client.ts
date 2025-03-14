import '../shared/app/i18n';
import 'bootstrap/scss/bootstrap.scss';
import './base.styl';

import 'reflect-metadata';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './vue/App.vue';
import router from './vue/router';
import unoverlay from '@overlastic/vue';
import usePlayerLocalSettingsStore from './stores/playerLocalSettingsStore';
import I18NextVue from 'i18next-vue';
import i18next from 'i18next';
import { head } from './services/head';
import useMatomo from './vue/useMatomo';
import './services/registerServiceWorker';
import './services/playerActivity';

const pinia = createPinia();

const vueApp = createApp(App);
vueApp.use(router);
vueApp.use(pinia);
vueApp.use(I18NextVue, { i18next });
vueApp.use(unoverlay);
vueApp.use(head);

useMatomo(vueApp);

// Load store now to set dark/light theme early enough and prevent blinking
usePlayerLocalSettingsStore();

vueApp.mount('#vue-app');
