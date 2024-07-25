import { Router } from 'express';
import { seo } from '../../../../shared/app/seo';

export function pwaRouter() {
    const router = Router();

    router.get('/pwa-manifest.json', async (_, res) => {
        const pwaManifest = {
            id: '/',
            short_name: seo.title,
            name: seo.title,
            description: seo.description,
            lang: 'en',
            orientation: 'any',
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

    return router;
}
