import fs from 'node:fs';
import path from 'path';
import { IS_DEV } from '../../../config.js';

type ViteEntry = { file: string, name?: string, isEntry?: boolean, css?: string[] };
type ViteManifest = { [key: string]: ViteEntry };
type ManifestType = { [key: string]: string };

const MANIFEST_PATH = path.join(process.cwd(), 'dist', 'statics', 'manifest.json');
const PUBLIC = '/statics/';

const flattenViteManifest = (raw: ViteManifest): ManifestType => {
    const result: ManifestType = {};

    for (const entry of Object.values(raw)) {
        if (!entry.isEntry && !entry.name?.includes('vendor')) {
            continue;
        }

        result[entry.name ?? entry.file] = PUBLIC + entry.file;

        for (const css of entry.css ?? []) {
            result[css] = PUBLIC + css;
        }
    }

    return result;
};

let manifestCache: null | ManifestType = null;

const readRawManifest = (): ViteManifest => JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as ViteManifest;

export function getManifest(): ManifestType {
    if (IS_DEV) {
        return {
            'vite-client': '/@vite/client',
            'main': '/src/client/client.ts',
        };
    }

    if (manifestCache !== null) {
        return manifestCache;
    }

    manifestCache = flattenViteManifest(readRawManifest());

    if (Object.keys(manifestCache).length === 0) {
        throw new Error('manifest.json has no entry or vendor chunks');
    }

    return manifestCache;
}

let bootstrapStylesheetUrlCache: null | string = null;

/**
 * URL of the (LTR) Bootstrap stylesheet, rendered directly in the page <head> so it loads
 * without waiting for the JS bundle (avoids a flash of unstyled content). The client swaps it
 * to the RTL build at runtime for right-to-left locales (see src/shared/app/i18n/rtl.ts).
 *
 * Served as a plain file (see registerHttpControllers), with the Bootstrap version as a cache
 * buster since the service worker caches /statics/ responses indefinitely.
 */
export function getBootstrapStylesheetUrl(): string {
    if (bootstrapStylesheetUrlCache !== null) {
        return bootstrapStylesheetUrlCache;
    }

    const { version } = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'node_modules', 'bootstrap', 'package.json'), 'utf-8')) as { version: string };

    bootstrapStylesheetUrlCache = `/statics/bootstrap-css/bootstrap.min.css?v=${version}`;

    return bootstrapStylesheetUrlCache;
}
