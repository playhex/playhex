import assert from 'assert';
import { describe, it } from 'mocha';
import { checkOAuthApiPolicy } from '../../oauth/oauthApiPolicy.js';

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
});
