import assert from 'assert';
import { ImportUserError } from '../errors.js';
import { LittleGolemLink } from '../handlers/LittleGolemLink.js';
import LittleGolemClient, { LittleGolemFetchError } from '../../little-golem/LittleGolemClient.js';

const clientReturning = (fetchGameHsgf: (gid: number) => Promise<string>): LittleGolemClient =>
    ({ fetchGameHsgf }) as unknown as LittleGolemClient;

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

    it('downloads hsgf of the game id from the url', async () => {
        const fetchedGids: number[] = [];
        const client = clientReturning(gid => {
            fetchedGids.push(gid);

            return Promise.resolve('(;FF[4]SZ[13]RE[W];W[am];B[ii])');
        });

        const importedGame = await new LittleGolemLink(client).import('https://littlegolem.net/jsp/game/game.jsp?gid=1512976&nmove=27');

        assert.deepStrictEqual(fetchedGids, [1512976]);
        assert.strictEqual(importedGame.boardsize, 13);
    });

    it('rejects a downloaded game that is not finished (no RE)', async () => {
        const client = clientReturning(() => Promise.resolve('(;FF[4]SZ[13];W[am];B[ii])'));

        await assert.rejects(
            () => new LittleGolemLink(client).import('https://littlegolem.net/jsp/game/game.jsp?gid=1512976'),
            ImportUserError,
        );
    });

    it('throws a user error when Little Golem cannot be reached', async () => {
        const client = clientReturning(() => Promise.reject(new LittleGolemFetchError('Little Golem responded 503')));

        await assert.rejects(
            () => new LittleGolemLink(client).import('https://littlegolem.net/jsp/game/game.jsp?gid=1512976'),
            ImportUserError,
        );
    });
});
