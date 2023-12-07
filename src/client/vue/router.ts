import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router';
import PageLobby from '@client/vue/pages/PageLobby.vue';
import PagePlayRemote from '@client/vue/pages/PagePlayRemote.vue';
import PagePlayOffline from '@client/vue/pages/PagePlayOffline.vue';
import PageLicense from '@client/vue/pages/content/PageLicense.vue';
import PageHexLinks from '@client/vue/pages/content/PageHexLinks.vue';
import PageNotFound from '@client/vue/pages/PageNotFound.vue';
import LayoutContent from '@client/vue/pages/content/LayoutContent.vue';
import ReloadOnRouteChange from '@client/vue/ReloadOnRouteChange.vue';

const routes: RouteRecordRaw[] = [
    {
        name: 'home',
        path: '/',
        component: PageLobby,
    },
    {
        path: '/',
        component: ReloadOnRouteChange,
        children: [
            {
                name: 'online-game',
                path: '/games/:gameId',
                component: PagePlayRemote,
                meta: {
                    displayFooter: false,
                },
            },
        ],
    },
    {
        name: 'play-vs-ai',
        path: '/play-vs-ai',
        component: PagePlayOffline,
        meta: {
            displayFooter: false,
        },
    },
    {
        path: '/',
        component: LayoutContent,
        children: [
            {
                name: 'license',
                path: 'about/license',
                component: PageLicense,
            },
            {
                name: 'links',
                path: 'resources/hex-links',
                component: PageHexLinks,
            },
        ],
    },
    {
        name: 'not-found',
        path: '/:pathMatch(.*)',
        component: PageNotFound,
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
