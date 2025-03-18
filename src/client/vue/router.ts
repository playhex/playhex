import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router';
import { useHeadDefault } from '../services/head.js';

const routes: RouteRecordRaw[] = [
    {
        name: 'home',
        path: '/',
        component: () => import('./pages/PageLobby.vue'),
    },
    {
        path: '/',
        component: () => import('./ReloadOnRouteChange.vue'),
        children: [
            {
                name: 'online-game',
                path: '/games/:gameId',
                component: () => import('./pages/PagePlayRemote.vue'),
                meta: {
                    displayFooter: false,
                },
            },
            {
                name: 'player',
                path: '/@:slug(.{1,32})', // Regex to avoid matching players public ids
                component: () => import('./pages/player/PagePlayer.vue'),
            },
        ],
    },
    {
        name: 'play-vs-ai',
        path: '/play-vs-ai',
        component: () => import('./pages/PagePlayOffline.vue'),
        meta: {
            displayFooter: false,
        },
    },
    {
        name: 'games-archive',
        path: '/games-archive',
        component: () => import('./pages/PageGamesArchive.vue'),
    },
    {
        name: 'login',
        path: '/login',
        component: () => import('./pages/player/PageLogin.vue'),
    },
    {
        name: 'signup',
        path: '/signup',
        component: () => import('./pages/player/PageSignup.vue'),
    },
    {
        name: 'settings',
        path: '/settings',
        component: () => import('./pages/player/PageSettings.vue'),
    },
    {
        path: '/',
        component: () => import('./pages/content/LayoutContent.vue'),
        children: [
            {
                name: 'license',
                path: 'about/license',
                component: () => import('./pages/content/PageLicense.vue'),
            },
            {
                name: 'links',
                path: 'resources/hex-links',
                component: () => import('./pages/content/PageHexLinks.vue'),
            },
            {
                name: 'rating-simulator',
                path: 'rating-simulator',
                component: () => import('./pages/content/PageRatingSimulator.vue'),
            },
            {
                name: 'contribute',
                path: 'contribute',
                component: () => import('./pages/content/PageContribute.vue'),
            },
            {
                name: 'contributors',
                path: 'contributors',
                component: () => import('./pages/content/PageContributors.vue'),
            },
            {
                name: 'spawn-worker',
                path: 'spawn-worker',
                component: () => import('./pages/content/PageSpawnWorker.vue'),
            },
            {
                name: 'analysis-details',
                path: 'hex-game-analysis',
                component: () => import('./pages/content/PageAnalysisDetails.vue'),
            },
            {
                name: 'privacy',
                path: 'privacy',
                component: () => import('./pages/content/PagePrivacyPolicy.vue'),
            },
        ],
    },
    {
        path: '/guide',
        component: () => import('./pages/guide/LayoutGuide.vue'),
        children: [
            {
                name: 'guide',
                path: '',
                component: () => import('./pages/guide/PageIndex.vue'),
            },
            {
                name: 'guide-ai-analysis',
                path: 'ai-analysis',
                component: () => import('./pages/guide/PageAIAnalysis.vue'),
            },
            {
                name: 'guide-conditional-moves',
                path: 'conditional-moves',
                component: () => import('./pages/guide/PageConditionalMoves.vue'),
            },
        ],
    },
    {
        name: 'rescue',
        path: '/rescue',
        component: () => import('./pages/PageRescue.vue'),
    },
    {
        name: 'test',
        path: '/test',
        component: () => import('./pages/PageTest.vue'),
    },
    {
        name: 'not-found',
        path: '/:pathMatch(.*)',
        component: () => import('./pages/PageNotFound.vue'),
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior: async to => {
        if (to.hash) {
            await new Promise(r => setTimeout(r, 100));
            return { el: to.hash };
        }

        // Yes, eslint, I return nothing here.
        return;
    },
});

router.beforeEach(() => {
    useHeadDefault();
});

export default router;
