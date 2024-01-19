import './bootstrap.scss';
import './base.styl';

import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './vue/App.vue';
import router from './vue/router';
import unoverlay from 'unoverlay-vue';
import useDarkLightThemeStore from './stores/darkLightThemeStore';

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then((reg) => {
            console.log('Registered successfully', reg);
        }).catch((error) => {
            console.log('Error', error);
        })
    ;
}

const pinia = createPinia();

const vueApp = createApp(App);
vueApp.use(router);
vueApp.use(pinia);
vueApp.use(unoverlay);

// Load store now to set theme early enough and prevent blinking
useDarkLightThemeStore();

vueApp.mount('#vue-app');
