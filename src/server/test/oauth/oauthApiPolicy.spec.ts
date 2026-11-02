import assert from 'assert';
import { describe, it } from 'mocha';
import { checkOAuthApiPolicy, checkOAuthClientApiPolicy } from '../../oauth/oauthApiPolicy.js';
import { isClientOnlyScope } from '../../../shared/app/oauth.js';

const scopes = (...values: string[]) => new Set(values);

describe('oauthApiPolicy', () => {
    it('allows reading with read or write scope', () => {
        assert.deepStrictEqual(checkOAuthApiPolicy('GET', '/api/games/abc', scopes('openid', 'read')), { allowed: true });
        assert.deepStrictEqual(checkOAuthApiPolicy('GET', '/api/games/abc', scopes('openid', 'write')), { allowed: true });
        assert.deepStrictEqual(checkOAuthApiPolicy('GET', '/api/auth/me', scopes('read')), { allowed: true });
    });

    it('denies api access with only openid scope', () => {
        assert.deepStrictEqual(
            checkOAuthApiPolicy('GET', '/api/games/abc', scopes('openid')),
            { allowed: false, reason: 'insufficient_scope', requiredScope: 'read' },
        );
    });

    it('requires write scope to act', () => {
        assert.deepStrictEqual(
            checkOAuthApiPolicy('POST', '/api/games/abc/move', scopes('openid', 'read')),
            { allowed: false, reason: 'insufficient_scope', requiredScope: 'write' },
        );
        assert.deepStrictEqual(checkOAuthApiPolicy('POST', '/api/games/abc/move', scopes('write')), { allowed: true });
        assert.deepStrictEqual(checkOAuthApiPolicy('PATCH', '/api/player-settings', scopes('write')), { allowed: true });
        assert.deepStrictEqual(checkOAuthApiPolicy('post', '/api/games', scopes('write')), { allowed: true });
    });

    it('never allows security routes, even with write scope', () => {
        const all = scopes('openid', 'read', 'write', 'offline_access');

        for (const [method, path] of [
            ['POST', '/api/auth/change-password'],
            ['POST', '/api/auth/login'],
            ['DELETE', '/api/auth/logout'],
            ['POST', '/api/auth/signup-from-guest'],
            ['GET', '/api/oauth/connected-applications'],
            ['DELETE', '/api/oauth/connected-applications/xyz'],
            ['GET', '/api/admin/ip'],
            ['GET', '/api/player-ai-worker-keys'],
            ['POST', '/api/ai-workers/jobs/next'],
            ['PUT', '/api/push-subscriptions'],
            ['POST', '/api/push/test'],
            ['PUT', '/api/players/me/little-golem'],
            ['PATCH', '/api/player-moderation-actions/abc/acknowledge'],
        ]) {
            assert.deepStrictEqual(checkOAuthApiPolicy(method, path, all), { allowed: false, reason: 'route_not_allowed' }, `${method} ${path}`);
        }
    });

    it('denies security routes whatever the case, as express routing is case insensitive', () => {
        const all = scopes('openid', 'read', 'write', 'offline_access');

        assert.deepStrictEqual(checkOAuthApiPolicy('POST', '/API/Auth/change-password', all), { allowed: false, reason: 'route_not_allowed' });
        assert.deepStrictEqual(checkOAuthApiPolicy('GET', '/Api/Player-AI-Worker-Keys', all), { allowed: false, reason: 'route_not_allowed' });
        assert.deepStrictEqual(checkOAuthApiPolicy('PUT', '/api/players/ME/little-golem', all), { allowed: false, reason: 'route_not_allowed' });
    });

    it('does not deny routes only sharing a prefix', () => {
        assert.deepStrictEqual(checkOAuthApiPolicy('GET', '/api/authors', scopes('read')), { allowed: true });
        assert.deepStrictEqual(checkOAuthApiPolicy('GET', '/api/players/me/little-golem', scopes('read')), { allowed: true });
        assert.deepStrictEqual(checkOAuthApiPolicy('GET', '/api/player-moderation-actions', scopes('read')), { allowed: true });
    });

    it('gives no right to a player token with only client only scopes', () => {
        assert.deepStrictEqual(
            checkOAuthApiPolicy('GET', '/api/games/abc', scopes('games:analyze')),
            { allowed: false, reason: 'insufficient_scope', requiredScope: 'read' },
        );
        assert.deepStrictEqual(
            checkOAuthApiPolicy('PUT', '/api/games/abc/analyze', scopes('read', 'games:analyze')),
            { allowed: false, reason: 'insufficient_scope', requiredScope: 'write' },
        );
    });
});

describe('oauthClientApiPolicy', () => {
    const gameId = '0d1f8e8c-3000-49ff-831a-84c20e514528';
    const analyze = scopes('games:analyze');

    it('allows importing and analyzing games with games:analyze scope', () => {
        for (const [method, path] of [
            ['POST', '/api/external-games/import'],
            ['GET', `/api/games/${gameId}`],
            ['GET', `/api/games/${gameId}/analyze`],
            ['GET', `/api/games/${gameId}/analyze/graph.png`],
            ['PUT', `/api/games/${gameId}/analyze`],
            ['GET', `/api/external-games/${gameId}`],
            ['GET', `/api/external-games/${gameId}/analyze`],
            ['GET', `/api/external-games/${gameId}/analyze/graph.png`],
            ['put', `/API/External-Games/${gameId.toUpperCase()}/analyze`],
        ]) {
            assert.deepStrictEqual(checkOAuthClientApiPolicy(method, path, analyze), { allowed: true }, `${method} ${path}`);
        }
    });

    it('requires games:analyze scope', () => {
        assert.deepStrictEqual(
            checkOAuthClientApiPolicy('POST', '/api/external-games/import', scopes('read', 'write')),
            { allowed: false, reason: 'insufficient_scope', requiredScope: 'games:analyze' },
        );
    });

    it('denies any other route', () => {
        for (const [method, path] of [
            ['GET', '/api/auth/me'],
            ['GET', '/api/games'],
            ['POST', '/api/games'],
            ['POST', `/api/games/${gameId}/move`],
            ['PUT', `/api/games/${gameId}/analyze/moves/mcts`],
            ['GET', `/api/games/${gameId}/analyze/graph.png/x`],
            ['DELETE', `/api/external-games/${gameId}/analyze`],
            ['GET', '/api/external-games/import'],
            ['GET', '/api/games/not-a-uuid'],
        ]) {
            assert.deepStrictEqual(checkOAuthClientApiPolicy(method, path, analyze), { allowed: false, reason: 'route_not_allowed' }, `${method} ${path}`);
        }
    });

    it('knows which scopes are client only', () => {
        assert.strictEqual(isClientOnlyScope('games:analyze'), true);
        assert.strictEqual(isClientOnlyScope('read'), false);
        assert.strictEqual(isClientOnlyScope('write'), false);
    });
});
