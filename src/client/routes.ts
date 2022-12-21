import { RouteRecordRaw } from 'vue-router';
import AppHome from './AppHome.vue';
import AppBoard from './AppBoard.vue';
import AppPlayVsAI from './AppPlayVsAI.vue';
import App1v1SameScreen from './App1v1SameScreen.vue';

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
    {
        path: '/play-1v1-same-screen',
        component: App1v1SameScreen,
    },
];

export default routes;
