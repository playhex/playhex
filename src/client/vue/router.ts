import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router';
import { useHeadDefault } from '../services/head';

const routes: RouteRecordRaw[] = [
    {
        name: 'home',
        path: '/',
        component: () => import('@client/vue/pages/PageLobby.vue'),
    },
    {
        path: '/',
        component: () => import('@client/vue/ReloadOnRouteChange.vue'),
        children: [
            {
                name: 'online-game',
                path: '/games/:gameId',
                component: () => import('@client/vue/pages/PagePlayRemote.vue'),
                meta: {
                    displayFooter: false,
                },
            },
            {
                name: 'player',
                path: '/@:slug(.{1,32})', // Regex to avoid matching players public ids
                component: () => import('@client/vue/pages/player/PagePlayer.vue'),
            },
        ],
    },
    {
        name: 'play-vs-ai',
        path: '/play-vs-ai',
        component: () => import('@client/vue/pages/PagePlayOffline.vue'),
        meta: {
            displayFooter: false,
        },
    },
    {
        name: 'login',
        path: '/login',
        component: () => import('@client/vue/pages/player/PageLogin.vue'),
    },
    {
        name: 'signup',
        path: '/signup',
        component: () => import('@client/vue/pages/player/PageSignup.vue'),
    },
    {
        name: 'settings',
        path: '/settings',
        component: () => import('@client/vue/pages/player/PageSettings.vue'),
    },
    {
        path: '/',
        component: () => import('@client/vue/pages/content/LayoutContent.vue'),
        children: [
            {
                name: 'license',
                path: 'about/license',
                component: () => import('@client/vue/pages/content/PageLicense.vue'),
            },
            {
                name: 'links',
                path: 'resources/hex-links',
                component: () => import('@client/vue/pages/content/PageHexLinks.vue'),
            },
            {
                name: 'contribute',
                path: 'contribute',
                component: () => import('@client/vue/pages/content/PageContribute.vue'),
            },
            {
                name: 'contributors',
                path: 'contributors',
                component: () => import('@client/vue/pages/content/PageContributors.vue'),
            },
            {
                name: 'spawn-worker',
                path: 'spawn-worker',
                component: () => import('@client/vue/pages/content/PageSpawnWorker.vue'),
            },
            {
                name: 'analysis-details',
                path: 'hex-game-analysis',
                component: () => import('@client/vue/pages/content/PageAnalysisDetails.vue'),
            },
            {
                name: 'privacy',
                path: 'privacy',
                component: () => import('@client/vue/pages/content/PagePrivacyPolicy.vue'),
            },
        ],
    },
    {
        name: 'rescue',
        path: '/rescue',
        component: () => import('@client/vue/pages/PageRescue.vue'),
    },
    {
        name: 'test',
        path: '/test',
        component: () => import('@client/vue/pages/PageTest.vue'),
    },
    {
        name: 'not-found',
        path: '/:pathMatch(.*)',
        component: () => import('@client/vue/pages/PageNotFound.vue'),
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach(() => {
    useHeadDefault();
});

export default router;
