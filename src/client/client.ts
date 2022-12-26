import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './vue/App.vue';
import useHexClient from '@client/hexClient';
import routes from './vue/routes';
import socket from '@client/socket';

const pinia = createPinia();
const router = createRouter({
    history: createWebHistory(),
    routes,
});

const vueApp = createApp(App);
vueApp.use(router);
vueApp.use(pinia);

useHexClient().listenSocket(socket);

vueApp.mount('#vue-app');
