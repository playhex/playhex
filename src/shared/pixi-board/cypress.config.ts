import { defineConfig } from 'cypress';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VISUAL_TEST_DIR = path.join(__dirname, 'dist', 'visual-test');
const SCREENSHOTS_FOLDER = path.join(__dirname, 'cypress', 'screenshots');
const EXPECTED_SCREENSHOT_DIR = path.join(__dirname, 'cypress', 'screenshots-expected');
const INDEX_HTML = path.join(__dirname, 'test', 'visual', 'index.html');
const SERVER_PORT = 9988;

let lastScreenshotPath = '';

export default defineConfig({
    e2e: {
        baseUrl: `http://localhost:${SERVER_PORT}`,
        specPattern: 'cypress/e2e/**/*.cy.ts',
        supportFile: 'cypress/support/visual.ts',
        screenshotsFolder: 'cypress/screenshots',
        setupNodeEvents(on) {
            const server = startServer();

            on('after:run', () => {
                server.close();
            });

            on('after:screenshot', details => {
                lastScreenshotPath = details.path;
            });

            on('task', {
                _pixelCompare: ({ update }: { update: boolean }) => {
                    return compareWithSnapshot(lastScreenshotPath, update);
                },
            });
        },
    },
});

function startServer(): http.Server {
    const server = http.createServer((req, res) => {
        const urlPath = !req.url || req.url === '/' ? '/index.html' : req.url;

        // Serve index.html from test/visual/, JS bundles from dist/visual-test/
        const filePath = urlPath === '/index.html'
            ? INDEX_HTML
            : path.join(VISUAL_TEST_DIR, urlPath);

        try {
            const content = fs.readFileSync(filePath);
            const ext = path.extname(filePath);
            const contentType = ext === '.js' ? 'application/javascript' : 'text/html';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        } catch {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    server.listen(SERVER_PORT).on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
            throw new Error(`Port ${SERVER_PORT} is already in use. Kill the existing process and retry.`);
        }
        throw err;
    });

    return server;
}

function compareWithSnapshot(actualPath: string, update: boolean): object {
    const expectedPath = path.join(EXPECTED_SCREENSHOT_DIR, path.relative(SCREENSHOTS_FOLDER, actualPath));

    if (update || !fs.existsSync(expectedPath)) {
        fs.mkdirSync(path.dirname(expectedPath), { recursive: true });
        fs.copyFileSync(actualPath, expectedPath);

        return { created: true };
    }

    const actual = PNG.sync.read(fs.readFileSync(actualPath));
    const expected = PNG.sync.read(fs.readFileSync(expectedPath));

    if (actual.width !== expected.width || actual.height !== expected.height) {
        throw new Error(
            `Snapshot size mismatch for "${expectedPath}": ` +
            `actual ${actual.width}x${actual.height}, expected ${expected.width}x${expected.height}`,
        );
    }

    const diff = new PNG({ width: actual.width, height: actual.height });
    const diffPixels = pixelmatch(actual.data, expected.data, diff.data, actual.width, actual.height, {
        threshold: 0,
        includeAA: true,
    });

    return { diffPixels, totalPixels: actual.width * actual.height };
};
