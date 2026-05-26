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

    const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as ViteManifest;
    manifestCache = flattenViteManifest(raw);

    if (Object.keys(manifestCache).length === 0) {
        throw new Error('manifest.json has no entry or vendor chunks');
    }

    return manifestCache;
}
