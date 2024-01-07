import fs from 'fs';
import path from 'path';
import { IS_DEV, WEBPACK_PORT } from '../../../config';

type ManifestType = { [key: string]: string };

/**
 * Do not include source maps in manifest to not load them as javascripts
 */
const removeUnwantedJs = (manifest: ManifestType): void => {
    Object.keys(manifest)
        .forEach(key => {
            // Remove source maps
            if (key.endsWith('.map')) {
                delete manifest[key];
            }

            // Remove lazy loaded vuejs routes
            if (key.includes('src_client_vue')) {
                delete manifest[key];
            }

            // Load pixijs only when required
            if (key.includes('pixi')) {
                delete manifest[key];
            }
        })
    ;
};

const getManifestFromWebpack = async (): Promise<ManifestType> => {
    const response = await fetch(`http://localhost:${WEBPACK_PORT}/statics/manifest.json`);
    const manifest: ManifestType = await response.json();

    removeUnwantedJs(manifest);

    return manifest;
};

let manifestCache: null | ManifestType = null;

export async function getManifest(): Promise<ManifestType> {
    if (IS_DEV) {
        // load from webpack dev server
        return getManifestFromWebpack();
    }

    if (null !== manifestCache) {
        return manifestCache;
    }

    // read from file system
    manifestCache = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'dist', 'statics', 'manifest.json'), 'utf-8').toString());

    if (!manifestCache) {
        throw new Error('"manifest.json" file not found');
    }

    removeUnwantedJs(manifestCache);

    return manifestCache;
}
