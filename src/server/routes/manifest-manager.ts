import fs from 'fs';
import path from 'path';
import { IS_DEV, WEBPACK_PORT } from '../config';

/* eslint-disable */

async function getManifestFromWebpack(): Promise<string> {
    const response = await fetch(`http://localhost:${WEBPACK_PORT}/statics/manifest.json`);

    return response.text();
}

let manifestStrCache: string;

export async function getManifest() {
    let manifestStr: string;
    if (IS_DEV) {
        // load from webpack dev server
        manifestStr = await getManifestFromWebpack();
    } else {
        if (manifestStrCache) {
            manifestStr = manifestStrCache;
        } else {
            // read from file system
            manifestStr = fs.readFileSync(path.join(process.cwd(), 'dist', 'statics', 'manifest.json'), 'utf-8').toString();
            manifestStrCache = manifestStr;
        }
    }
    const manifest = JSON.parse(manifestStr);
    return manifest;
}
