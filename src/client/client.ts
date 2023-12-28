import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './base.styl';
import './sentry';

import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './vue/App.vue';
import router from './vue/router';
import unoverlay from 'unoverlay-vue';

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

vueApp.mount('#vue-app');
