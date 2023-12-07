import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router';
import PageHome from '@client/vue/pages/PageHome.vue';
import Page1v1 from '@client/vue/pages/Page1v1.vue';
import PagePlayVsAI from '@client/vue/pages/PagePlayVsAI.vue';
import PageLicense from '@client/vue/pages/content/PageLicense.vue';
import PageHexLinks from '@client/vue/pages/content/PageHexLinks.vue';
import PageNotFound from '@client/vue/pages/PageNotFound.vue';
import LayoutContent from '@client/vue/pages/content/LayoutContent.vue';
import ReloadOnRouteChange from '@client/vue/ReloadOnRouteChange.vue';

const routes: RouteRecordRaw[] = [
    {
        name: 'home',
        path: '/',
        component: PageHome,
    },
    {
        path: '/',
        component: ReloadOnRouteChange,
        children: [
            {
                name: 'online-game',
                path: '/games/:gameId',
                component: Page1v1,
                meta: {
                    displayFooter: false,
                },
            },
        ],
    },
    {
        name: 'play-vs-ai',
        path: '/play-vs-ai',
        component: PagePlayVsAI,
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
