import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import routes from './routes';

const router = createRouter({
    history: createWebHistory(),
    routes,
});

const vueApp = createApp(App);
vueApp.use(router);

vueApp.mount('#vue-app');
