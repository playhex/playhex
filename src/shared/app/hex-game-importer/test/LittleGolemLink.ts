import assert from 'assert';
import { ImportUserError } from '../errors.js';
import { LittleGolemLink, parseLittleGolemGameId } from '../handlers/LittleGolemLink.js';
import { LittleGolemGameNotFinishedError } from '../../little-golem/littleGolemHsgf.js';
import LittleGolemClient, { LittleGolemFetchError } from '../../little-golem/LittleGolemClient.js';

const clientReturning = (fetchGameHsgf: (gid: number) => Promise<string>): LittleGolemClient =>
    ({ fetchGameHsgf }) as unknown as LittleGolemClient;

describe('LittleGolemLink', () => {
    it('parses game id from all Little Golem game urls', () => {
        const urls: [string, number][] = [
            ['https://www.littlegolem.net/web/game?id=2566487', 2566487],
            ['https://littlegolem.net/web/game?id=2566487', 2566487],
            ['https://www.littlegolem.net/web/play?id=2566487', 2566487],
            ['https://www.littlegolem.net/app/#/game/daily/2566487', 2566487],
            ['https://www.littlegolem.net/app/#/web-replay/2566487?move=23', 2566487],
            ['https://www.littlegolem.net/app/#/games/game/2566487', 2566487],
            ['https://www.littlegolem.net/app/#/tournament/hex.ch.30.1.1/game/1512976', 1512976],
            ['https://www.littlegolem.net/app/#/player/2844/stats/hex/DEFAULT/game/1512976', 1512976],
            ['https://api.littlegolem.net/gameexport/1512976', 1512976],
            ['https://old.littlegolem.net/jsp/game/game.jsp?gid=1512976', 1512976],
            ['https://littlegolem.net/jsp/game/game.jsp?gid=1512976&nmove=27', 1512976],
            ['  https://www.littlegolem.net/web/game?id=2566487  ', 2566487],
        ];

        for (const [url, gid] of urls) {
            assert.strictEqual(parseLittleGolemGameId(url), gid, url);
            assert.strictEqual(new LittleGolemLink().supports(url), true, url);
        }
    });

    it('does not parse a game id from Little Golem urls that are not a game', () => {
        assert.strictEqual(parseLittleGolemGameId('https://www.littlegolem.net/web/players/4189'), null);
        assert.strictEqual(parseLittleGolemGameId('https://www.littlegolem.net/app/#/player/4189'), null);
        assert.strictEqual(parseLittleGolemGameId('https://www.littlegolem.net/web/ladder/hex/DEFAULT?from_game=2566487'), null);
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

    it('rejects a game that Little Golem does not export because not finished', async () => {
        const client = clientReturning(() => Promise.reject(new LittleGolemGameNotFinishedError()));

        await assert.rejects(
            () => new LittleGolemLink(client).import('https://www.littlegolem.net/web/game?id=2566487'),
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
