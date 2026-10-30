import assert from 'assert';
import { describe, it } from 'mocha';
import type { Request, Response } from 'express';
import { initSocialMeta, resolveMeta } from '../../social-preview/socialPreviewMiddlewares.js';

const crawler = 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)';
const browser = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const createRequest = (userAgent: string, query: { [key: string]: string } = {}): Request => ({
    path: '/games/abc',
    query,
    params: {},
    originalUrl: '/games/abc',
    get: (header: string) => header.toLowerCase() === 'user-agent' ? userAgent : undefined,
    acceptsLanguages: () => false,
}) as unknown as Request;

const createResponse = (): Response & { varied: string[] } => {
    const varied: string[] = [];

    return {
        locals: {},
        varied,
        vary: (field: string) => varied.push(field),
    } as unknown as Response & { varied: string[] };
};

/**
 * Runs init middleware then resolver, returns what was passed to next() calls.
 */
const run = async (req: Request, res: Response, resolver: Parameters<typeof resolveMeta>[0], timeoutMs?: number): Promise<unknown[]> => {
    const nextCalls: unknown[] = [];

    initSocialMeta('https://playhex.org')(req, res, (arg?: unknown) => nextCalls.push(arg));
    await resolveMeta(resolver, timeoutMs)(req, res, (arg?: unknown) => nextCalls.push(arg));

    return nextCalls;
};

describe('social preview middlewares', () => {
    it('skips the whole router for real visitors', async () => {
        const res = createResponse();
        let resolverCalled = false;

        const nextCalls = await run(createRequest(browser), res, () => {
            resolverCalled = true;
            return Promise.resolve(null);
        });

        assert.strictEqual(nextCalls[0], 'router');
        assert.strictEqual(res.locals.socialMeta, undefined);
        assert.strictEqual(resolverCalled, false);
        assert.deepStrictEqual(res.varied, ['User-Agent']);
    });

    it('completes default meta for crawlers', async () => {
        const res = createResponse();

        const nextCalls = await run(createRequest(crawler, { lang: 'fr' }), res, () => Promise.resolve({ title: 'Game title' }));

        assert.deepStrictEqual(nextCalls, [undefined, undefined]);
        assert.strictEqual(res.locals.socialMeta?.title, 'Game title');
        assert.strictEqual(res.locals.socialMeta?.locale, 'fr');
        assert.strictEqual(res.locals.socialMeta?.url, 'https://playhex.org/games/abc?lang=fr');
        assert.strictEqual(res.locals.socialMeta?.noindex, false);
    });

    it('keeps default meta and does not index when entity is not found', async () => {
        const res = createResponse();

        const nextCalls = await run(createRequest(crawler), res, () => Promise.resolve(null));

        assert.deepStrictEqual(nextCalls, [undefined, undefined]);
        assert.strictEqual(res.locals.socialMeta?.title, 'PlayHex');
        assert.strictEqual(res.locals.socialMeta?.noindex, true);
    });

    it('keeps default meta on error or timeout, page is still rendered', async () => {
        const failingRes = createResponse();

        assert.deepStrictEqual(await run(createRequest(crawler), failingRes, () => Promise.reject(new Error('Database down'))), [undefined, undefined]);
        assert.strictEqual(failingRes.locals.socialMeta?.title, 'PlayHex');

        const slowRes = createResponse();
        const slowResolver = () => new Promise<{ title: string }>(resolve => setTimeout(() => resolve({ title: 'Too late' }), 100));

        assert.deepStrictEqual(await run(createRequest(crawler), slowRes, slowResolver, 10), [undefined, undefined]);
        assert.strictEqual(slowRes.locals.socialMeta?.title, 'PlayHex');
    });
});
