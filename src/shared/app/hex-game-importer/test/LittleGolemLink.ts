import assert from 'assert';
import { ImportUserError } from '../errors.js';
import { LittleGolemLink } from '../handlers/LittleGolemLink.js';

describe('LittleGolemLink', () => {
    it('supports a Little Golem game url', () => {
        assert.strictEqual(new LittleGolemLink().supports('https://littlegolem.net/jsp/game/game.jsp?gid=1512976&nmove=27'), true);
    });

    it('does not support an unrelated url', () => {
        assert.strictEqual(new LittleGolemLink().supports('https://playhex.org/games/0d1f8e8c-3000-49ff-831a-84c20e514528'), false);
    });

    it('requires fetch from backend', () => {
        assert.strictEqual(new LittleGolemLink().shouldFetchFromBackend(), true);
    });

    it('rejects a downloaded game that is not finished (no RE)', async () => {
        const originalFetch = global.fetch;

        global.fetch = (async () => new Response('(;FF[4]SZ[13];W[am];B[ii])', { status: 200 })) as typeof fetch;

        try {
            await assert.rejects(
                () => new LittleGolemLink().import('https://littlegolem.net/jsp/game/game.jsp?gid=1512976'),
                ImportUserError,
            );
        } finally {
            global.fetch = originalFetch;
        }
    });
});
