import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import useHexClient from './hexClient';
import routes from './routes';
import socket from './socket';

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
