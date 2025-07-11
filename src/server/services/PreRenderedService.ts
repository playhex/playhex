import { Service } from 'typedi';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { renderFile } from 'ejs';
import { getManifest } from '../controllers/http/misc/manifest-manager.js';
import { seo } from '../../shared/app/seo.js';

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

type PreRenderedPagesManifest = PreRenderedPage[];

@Service()
export class PreRenderedService
{
    /**
     * Cache template rendered for a given url ("/en/landing" => "<html>...")
     */
    private cache: { [path: string]: string } = {};

    /**
     * Load all templates in memory for faster delivery.
     * Reset cache if already preloaded.
     */
    async preloadTemplatesInMemory(manifest: null | PreRenderedPagesManifest = null): Promise<void>
    {
        if (null === manifest) {
            manifest = this.readPreRenderedPagesManifest();
        }

        this.cache = {};

        for (const preRenderedRouter of manifest) {
            await this.renderTemplate(preRenderedRouter);
        }
    }

    /**
     * Render a full pre rendered page from parts
     */
    async renderTemplate(preRenderedPage: PreRenderedPage): Promise<string>
    {
        const { path, templateParts } = preRenderedPage;

        if (this.cache[path]) {
            return this.cache[path];
        }

        const pageVariables = {
            manifest: await getManifest(),
            seo,
            baseUrl: process.env.BASE_URL,
            sentryLoaderScript: process.env.SENTRY_LOADER_SCRIPT,
            blockRobotsIndex: 'true' === process.env.BLOCK_ROBOTS_INDEX,

            lang: this.readTemplatePart(templateParts.lang),
            head: this.readTemplatePart(templateParts.head),
            app: this.readTemplatePart(templateParts.app),
        };

        return this.cache[path] = await renderFile(
            join(process.cwd(), 'views', 'page-pre-rendered.ejs'),
            pageVariables,
        );
    }

    /**
     * Get content of a template part
     *
     * @param template e.g "en_landing__head.html"
     */
    readTemplatePart(template: string): string
    {
        return readFileSync(join(process.cwd(), 'views', template), 'utf-8');
    }

    /**
     * Get manifest content
     */
    readPreRenderedPagesManifest(): PreRenderedPagesManifest
    {
        if (!existsSync(manifestPath)) {
            return [];
        }

        try {
            return JSON.parse(readFileSync(manifestPath, 'utf-8').toString());
        } catch (e) {
            return [];
        }
    }
}
