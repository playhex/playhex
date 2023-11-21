import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './base.styl';

import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './vue/App.vue';
import useHexStore from '@client/stores/hexStore';
import routes from './vue/routes';
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
const router = createRouter({
    history: createWebHistory(),
    routes,
});

const vueApp = createApp(App);
vueApp.use(router);
vueApp.use(pinia);
vueApp.use(unoverlay);

// TODO move following lines this to store
useHexStore().updateGames();

(async () => {
    await useHexStore().getUserOrLoginAsGuest();

    useHexStore().reconnectSocket();
    useHexStore().listenSocket();
})();

vueApp.mount('#vue-app');
