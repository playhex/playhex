import path from 'path';
import fs from 'node:fs';
import { RequestHandler, Request, Response } from 'express';
import logger from '../../../services/logger.js';

const MIME_TYPES: Record<string, string> = {
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.html': 'text/html',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.txt': 'text/plain',
    '.xml': 'application/xml',
    '.map': 'application/json',
};

type FileEntry = { content: Buffer, mimeType: string, etag: string };
type FileCache = Map<string, FileEntry>;

function loadDir(dir: string, baseDir: string, cache: FileCache): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            loadDir(fullPath, baseDir, cache);
        } else {
            const urlPath = '/' + path.relative(baseDir, fullPath).replace(/\\/g, '/');
            const content = fs.readFileSync(fullPath);
            const etag = `"${content.length.toString(16)}-${fs.statSync(fullPath).mtimeMs.toString(16)}"`;
            const ext = path.extname(entry.name).toLowerCase();
            cache.set(urlPath, { content, mimeType: MIME_TYPES[ext] ?? 'application/octet-stream', etag });
        }
    }
}

function buildCache(dir: string): FileCache {
    const cache: FileCache = new Map();
    loadDir(dir, dir, cache);
    logger.info(`Statics cache loaded: ${cache.size} files`);
    return cache;
}

export function memoryStatic(dir: string): RequestHandler {
    const cache = buildCache(dir);

    return (req: Request, res: Response) => {
        const entry = cache.get(req.path);

        if (!entry) {
            res.status(404).end();
            return;
        }

        res.setHeader('ETag', entry.etag);

        if (req.headers['if-none-match'] === entry.etag) {
            res.status(304).end();
            return;
        }

        res.setHeader('Content-Type', entry.mimeType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.end(entry.content);
    };
}
