import { RouteRecordRaw } from 'vue-router';
import PageHome from './pages/PageHome.vue';
import Page1v1 from './pages/Page1v1.vue';
import PagePlayVsAI from './pages/PagePlayVsAI.vue';
import Page1v1SameScreen from './pages/Page1v1SameScreen.vue';

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
    {
        path: '/play-1v1-same-screen',
        component: Page1v1SameScreen,
    },
];

export default routes;
