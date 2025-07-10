import { Router } from 'express';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { renderFile } from 'ejs';
import { getManifest } from './manifest-manager.js';
import { seo } from '../../../../shared/app/seo.js';

const manifestPath: string = join(process.cwd(), 'views', 'pre-rendered', 'manifest.json');

/**
 * Format of the manifest
 */
type PreRenderedPage = {
    /**
     * Which url path is pre-rendered
     */
    path: string;

    /**
     * Document is split into parts
     * to still inject current js bundle
     */
    templateParts: {

        /**
         * txt file containing only the lang in <html lang="XX">
         */
        lang: string;

        /**
         * html inside <head>
         */
        head: string;

        /**
         * html inside <div id="vue-app">
         */
        app: string;
    };
};

type Manifest = PreRenderedPage[];

const cache: { [template: string]: string } = {};

/**
 * Serve some pre-rendered pages to make them
 * well indexed in search engines.
 */
export function preRenderedRouter(): Router {
    const manifest = loadPreRenderedPagesFromManifest();
    const router = Router();

    for (const preRenderedPage of manifest) {
        router.get(preRenderedPage.path, async (_, res) => {
            res.send(await renderTemplate(preRenderedPage));
        });
    }

    preloadTemplatesInMemory(manifest);

    return router;
}

/**
 * Load templates in memory for faster delivery
 */
const preloadTemplatesInMemory = async (manifest: Manifest): Promise<void> => {
    for (const preRenderedRouter of manifest) {
        renderTemplate(preRenderedRouter);
    }
};

const renderTemplate = async (preRenderedPage: PreRenderedPage): Promise<string> => {
    const { path, templateParts } = preRenderedPage;

    if (cache[path]) {
        return cache[path];
    }

    const pageVariables = {
        manifest: await getManifest(),
        seo,
        baseUrl: process.env.BASE_URL,
        sentryLoaderScript: process.env.SENTRY_LOADER_SCRIPT,
        blockRobotsIndex: 'true' === process.env.BLOCK_ROBOTS_INDEX,

        lang: readTemplatePart(templateParts.lang),
        head: readTemplatePart(templateParts.head),
        app: readTemplatePart(templateParts.app),
    };

    return cache[path] = await renderFile(
        join(process.cwd(), 'views', 'page-pre-rendered.ejs'),
        pageVariables,
    );
};

const readTemplatePart = (template: string): string => {
    if (!cache[template]) {
        cache[template] = readFileSync(join(process.cwd(), 'views', template), 'utf-8');
    }

    return cache[template];
};

const loadPreRenderedPagesFromManifest = (): Manifest => {
    if (!existsSync(manifestPath)) {
        return [];
    }

    try {
        return JSON.parse(readFileSync(manifestPath, 'utf-8').toString());
    } catch (e) {
        return [];
    }
};
