import { Service } from 'typedi';
import { readFile } from 'node:fs/promises';
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
     * Whether response should be served faster.
     * If true, should cache response in memory.
     */
    optimize?: boolean;

    /**
     * Document is split into parts
     * to still inject current js bundle
     */
    templateParts: {

        /**
         * lang of the html document, to insert inside: <html lang="XX">
         */
        lang: string;

        /**
         * file containing the html inside <head>
         */
        head: string;

        /**
         * file containing the html inside <div id="vue-app">
         */
        body: string;
    };
};

type PreRenderedPagesManifest = {
    /**
     * Key is the pre-rendered url path
     */
    [path: string]: PreRenderedPage;
};

@Service()
export class PreRenderedService
{
    /**
     * Cache template rendered for a given url ("/en/landing" => "<html>...")
     */
    private cache: { [path: string]: string } = {};

    private manifestPromise: null | Promise<PreRenderedPagesManifest> = null;

    async canHandlePath(path: string): Promise<boolean>
    {
        const manifest = await this.getManifest();

        return manifest.hasOwnProperty(path);
    }

    async getAllPreRenderedPaths(): Promise<string[]>
    {
        return Object.keys(await this.getManifest());
    }

    /**
     * Load all templates in memory for faster delivery.
     * Reset cache if already preloaded.
     */
    async preloadTemplatesInMemory(): Promise<void>
    {
        this.manifestPromise = null;
        this.cache = {};

        const manifest = await this.getManifest();

        for (const path in manifest) {
            const preRenderedPage = manifest[path];

            if (!preRenderedPage.optimize) {
                continue;
            }

            this.cache[path] = await this.doRenderTemplate(path);
        }
    }

    /**
     * Get a full pre rendered page content
     */
    async renderTemplate(path: string): Promise<string>
    {
        if (this.cache[path]) {
            return this.cache[path];
        }

        return await this.doRenderTemplate(path);
    }

    private async doRenderTemplate(path: string): Promise<string>
    {
        const manifest = await this.getManifest();
        const preRenderedPage = manifest[path];
        const { templateParts } = preRenderedPage;

        const pageVariables = {
            manifest: await getManifest(),
            seo,
            baseUrl: process.env.BASE_URL,
            sentryLoaderScript: process.env.SENTRY_LOADER_SCRIPT,
            blockRobotsIndex: process.env.BLOCK_ROBOTS_INDEX === 'true',

            lang: templateParts.lang,
            head: await this.readTemplatePart(templateParts.head),
            body: await this.readTemplatePart(templateParts.body),
        };

        return await renderFile(
            join(process.cwd(), 'views', 'page-pre-rendered.ejs'),
            pageVariables,
        );
    }

    /**
     * Get content of a template part
     *
     * @param template e.g "en_landing__head.html"
     */
    async readTemplatePart(template: string): Promise<string>
    {
        return await readFile(join(process.cwd(), 'views', template), 'utf-8');
    }

    /**
     * Get manifest content
     */
    getManifest(): Promise<PreRenderedPagesManifest>
    {
        if (this.manifestPromise !== null) {
            return this.manifestPromise;
        }

        return this.manifestPromise = (async (): Promise<PreRenderedPagesManifest> => {
            try {
                return JSON.parse((await readFile(manifestPath)).toString());
            } catch (e) {
                return {};
            }
        })();
    }
}
