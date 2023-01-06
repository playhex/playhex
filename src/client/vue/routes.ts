import { RouteRecordRaw } from 'vue-router';
import PageHome from './pages/PageHome.vue';
import Page1v1 from './pages/Page1v1.vue';
import PagePlayVsAI from './pages/PagePlayVsAI.vue';

const routes: RouteRecordRaw[] = [
    {
        name: 'home',
        path: '/',
        component: PageHome,
    },
    {
        name: 'online-game',
        path: '/games/:gameId',
        component: Page1v1,
    },
    {
        name: 'play-vs-ai',
        path: '/play-vs-ai',
        component: PagePlayVsAI,
    },
];

export default routes;
