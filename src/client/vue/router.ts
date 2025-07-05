import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router';

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
        path: '/tournaments',
        component: () => import('./ReloadOnRouteChange.vue'), // When clicking on tournament icon in header, trigger tournament reload if we are on another tournament page
        children: [
            {
                name: 'tournaments',
                path: '',
                component: () => import('./tournaments/pages/PageTournaments.vue'),
            },
            {
                name: 'tournaments-create',
                path: 'create',
                component: () => import('./tournaments/pages/PageCreateTournament.vue'),
            },
            {
                name: 'tournament',
                path: ':slug',
                component: () => import('./tournaments/pages/PageTournament.vue'),
            },
            {
                name: 'tournament-manage',
                path: ':slug/edit',
                component: () => import('./tournaments/pages/PageManageTournament.vue'),
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
                name: 'export-games-data',
                path: 'export-games-data',
                component: () => import('./pages/content/PageExportGamesData.vue'),
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
        path: '/',
        component: () => import('./pages/guide/LayoutGuide.vue'),
        children: [
            {
                name: 'landing',
                path: 'landing',
                component: () => import('./pages/guide/landing/PageLandingEn.vue'),
            },
            {
                name: 'landing-cs',
                path: 'cs/landing',
                component: () => import('./pages/guide/landing/PageLandingCs.vue'),
            },
            {
                name: 'landing-de',
                path: 'de/landing',
                component: () => import('./pages/guide/landing/PageLandingDe.vue'),
            },
            {
                name: 'landing-en',
                path: 'en/landing',
                component: () => import('./pages/guide/landing/PageLandingEn.vue'),
            },
            {
                name: 'landing-fr',
                path: 'fr/landing',
                component: () => import('./pages/guide/landing/PageLandingFr.vue'),
            },
            {
                name: 'landing-ja',
                path: 'ja/landing',
                component: () => import('./pages/guide/landing/PageLandingJa.vue'),
            },
            {
                name: 'landing-ko',
                path: 'ko/landing',
                component: () => import('./pages/guide/landing/PageLandingKo.vue'),
            },
            {
                name: 'landing-pl',
                path: 'pl/landing',
                component: () => import('./pages/guide/landing/PageLandingPl.vue'),
            },
            {
                name: 'landing-tr',
                path: 'tr/landing',
                component: () => import('./pages/guide/landing/PageLandingTr.vue'),
            },
            {
                name: 'landing-zh',
                path: 'zh/landing',
                component: () => import('./pages/guide/landing/PageLandingZh.vue'),
            },
        ],
    },
    {
        name: 'cijm',
        path: '/tournoi-hex-paris-2025',
        component: () => import('./pages/content/PageCijm.vue'),
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
        let elementExists = false;

        try {
            elementExists = null !== document.querySelector(to.hash);
        } catch {
            // Ignore error when hash is "invalid", because of e.g a dot, example:
            // Document.querySelector: '#match-1.6' is not a valid selector
            return;
        }

        if (to.hash && elementExists) {
            await new Promise(r => setTimeout(r, 100));
            return { el: to.hash };
        }

        // Yes, eslint, I return nothing here.
        return;
    },
});

export default router;
