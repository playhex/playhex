import './bootstrap.scss';
import './base.styl';

import 'reflect-metadata';
import '../shared/app/i18n';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './vue/App.vue';
import router from './vue/router';
import unoverlay from 'unoverlay-vue';
import useDarkLightThemeStore from './stores/darkLightThemeStore';
import I18NextVue from 'i18next-vue';
import i18next from 'i18next';
import { head } from './services/head';

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .catch((error) => {
            // eslint-disable-next-line no-console
            console.error('Error while worker registering', error);
        })
    ;
}

const pinia = createPinia();

const vueApp = createApp(App);
vueApp.use(router);
vueApp.use(pinia);
vueApp.use(I18NextVue, { i18next });
vueApp.use(unoverlay);
vueApp.use(head);

// Load store now to set theme early enough and prevent blinking
useDarkLightThemeStore();

vueApp.mount('#vue-app');
