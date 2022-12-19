import { RouteRecordRaw } from 'vue-router';
import AppHome from './AppHome.vue';
import AppBoard from './AppBoard.vue';
import AppPlayVsAI from './AppPlayVsAI.vue';

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        component: AppHome,
    },
    {
        path: '/games/:gameId',
        component: AppBoard,
    },
    {
        path: '/play-vs-ai',
        component: AppPlayVsAI,
    },
];

export default routes;
