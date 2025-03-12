import { Router } from 'express';
import type { WebAppManifest } from 'web-app-manifest';
import { seo } from '../../../../shared/app/seo';

const { BASE_URL } = process.env;

export function pwaRouter(): Router {
    const router = Router();
    // https://localhost:3000/games/fb9f7bac-65d1-45ef-bf55-5747f6381070
    router.get('/pwa-manifest.json', (_, res) => {
        const pwaManifest: PwaManifest = {
            id: '/',
            short_name: seo.title,
            name: seo.title,
            description: seo.description,
            lang: 'en',
            start_url: '/',
            theme_color: '#DC3545',
            background_color: '#212529',
            display: 'standalone',
            display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
            scope: '/',
            prefer_related_applications: false,
            categories: ['games', 'entertainment'],
            dir: 'auto',
            launch_handler: {
                client_mode: ['navigate-existing', 'auto'],
            },
            handle_links: BASE_URL ? 'preferred' : 'auto',
            scope_extensions: BASE_URL
                ? [
                    {
                        type: 'origin',
                        value: BASE_URL,
                    },
                ]
                : undefined
            ,
            url_handlers: BASE_URL
                ? [
                    { origin: BASE_URL },
                ]
                : undefined
            ,
            shortcuts: [
                {
                    name: 'Play offline vs AI',
                    short_name: 'Play AI',
                    description: 'Play locally with an AI',
                    url: '/play-vs-ai',
                    icons: [
                        {
                            src: '/images/logo-transparent.svg',
                            sizes: 'any',
                            type: 'image/svg+xml',
                        },
                    ],
                },
            ],
            screenshots: [
                {
                    src: '/images/screenshots/game.png',
                    type: 'image/png',
                    sizes: '3156x1863',
                    form_factor: 'wide',
                    label: 'Game view with analyze by AI',
                },
                {
                    src: '/images/screenshots/game-narrow.png',
                    type: 'image/png',
                    sizes: '1080x2172',
                    form_factor: 'narrow',
                    label: 'Play Hex',
                },
                {
                    src: '/images/screenshots/create-game-narrow.png',
                    type: 'image/png',
                    sizes: '1491x2436',
                    form_factor: 'narrow',
                    label: 'Create game vs AI',
                },
                {
                    src: '/images/screenshots/review-game.png',
                    type: 'image/png',
                    sizes: '3936x2436',
                    form_factor: 'wide',
                    label: 'Analyze game with AI',
                },
                {
                    src: '/images/screenshots/review-game-narrow.png',
                    type: 'image/png',
                    sizes: '1491x2436',
                    form_factor: 'narrow',
                    label: 'Analyze game with AI',
                },
            ],
            icons: [
                {
                    src: '/images/logo-transparent.svg',
                    type: 'image/svg+xml',
                    sizes: '512x512',
                    purpose: 'any',
                },
                {
                    src: '/images/logo-transparent.svg',
                    type: 'image/svg+xml',
                    sizes: 'any',
                    purpose: 'any',
                },
                {
                    src: '/images/logo-maskable.svg',
                    type: 'image/svg+xml',
                    sizes: '512x512',
                    purpose: 'maskable',
                },
                {
                    src: '/images/logo-maskable.svg',
                    type: 'image/svg+xml',
                    sizes: 'any',
                    purpose: 'maskable',
                },
            ],
        };

        res.send(pwaManifest);
    });

    /*
     * Open links in PWA.
     *
     * https://github.com/WICG/manifest-incubations/blob/gh-pages/scope_extensions-explainer.md#association-file
     */
    if (BASE_URL) {
        // Serve web-app-origin-association
        // Using the "next" form
        // https://github.com/WICG/manifest-incubations/blob/gh-pages/scope_extensions-explainer.md#future-work-under-consideration
        router.get([
            '/.well-known/web-app-origin-association',
            '/web-app-origin-association', // handles this alternate but obsolete path
        ], (_, res) => {
            res.send({
                web_apps: [
                    {
                        web_app_identity: BASE_URL,
                        authorize: [
                            'intercept-links',
                        ],
                    },
                ],
            });
        });
    }

    return router;
}

type PwaManifest = WebAppManifest & {
    /**
     * https://github.com/WICG/pwa-url-handler/blob/main/handle_links/explainer.md#handle_links-manifest-member
     */
    handle_links?: 'auto' | 'preferred' | 'not-preferred';

    /**
     * https://github.com/WICG/manifest-incubations/blob/gh-pages/scope_extensions-explainer.md#proposed-solution
     */
    scope_extensions?: {
        type: 'origin';
        value: string;
    }[];

    /**
     * Obsolete, seems to be replaced by handle_links + scope_extensions
     *
     * https://github.com/WICG/pwa-url-handler/blob/main/explainer.md
     */
    url_handlers?: { origin: string }[];
};
