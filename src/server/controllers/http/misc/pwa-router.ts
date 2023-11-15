import { Router } from 'express';
import seo from '../../../../shared/app/seo';

export function pwaRouter() {
    const router = Router();

    router.get('/pwa-manifest.json', async (_, res) => {
        const pwaManifest = {
            short_name: seo.shortTitle,
            name: seo.title,
            description: seo.description,
            lang: 'en',
            orientation: 'any',
            start_url: '/',
            theme_color: '#DC3545',
            background_color: '#212529',
            display: 'standalone',
            scope: '/',
            prefer_related_applications: false,
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
                    sizes: '1368x918',
                    form_factor: 'wide',
                },
            ],
            icons: [
                {
                    src: '/images/logo-transparent.svg',
                    type: 'image/svg+xml',
                    sizes: 'any',
                },
                {
                    src: '/images/splash.png',
                    type: 'image/png',
                    sizes: '512x512',
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
