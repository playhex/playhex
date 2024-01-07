import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router';

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
        ],
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

export default router;
