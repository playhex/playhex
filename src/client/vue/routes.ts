import { RouteRecordRaw } from 'vue-router';
import PageHome from './pages/PageHome.vue';
import Page1v1 from './pages/Page1v1.vue';
import PagePlayVsAI from './pages/PagePlayVsAI.vue';

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        component: PageHome,
    },
    {
        path: '/games/:gameId',
        component: Page1v1,
    },
    {
        path: '/play-vs-ai',
        component: PagePlayVsAI,
    },
];

export default routes;
