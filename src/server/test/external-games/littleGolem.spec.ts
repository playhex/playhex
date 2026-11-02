import assert from 'assert';
import { readFileSync } from 'fs';
import { describe, it } from 'mocha';
import { findPlayerByPseudo, parseGameDetail, parsePlayerGames, parsePlayerList, parsePlayerStatsPseudo, parsePlidInput } from '../../external-games/little-golem/littleGolemParsers.js';
import { LittleGolemGameNotFinishedError, parseLittleGolemHsgf } from '../../../shared/app/little-golem/littleGolemHsgf.js';

const fixture = (name: string): string => readFileSync(`${import.meta.dirname}/fixtures/${name}`, 'utf8');

describe('Little Golem parsers', () => {
    it('parses player search results', () => {
        const html = fixture('lg-player-search-bennok.html');

        assert.deepStrictEqual(parsePlayerList(html), [{ plid: 2883, pseudo: 'bennok' }]);
        assert.deepStrictEqual(findPlayerByPseudo(html, 'Bennok '), { plid: 2883, pseudo: 'bennok' });
        assert.strictEqual(findPlayerByPseudo(html, 'benno'), null);
    });

    it('finds the first player with this pseudo, as pseudos are not unique', () => {
        const html = '<tr><td><a href="/web/players/2844">Jonathan</a></td></tr>'
            + '<tr><td><a href="/web/players/5072">Jonathan</a></td></tr>'
        ;

        assert.deepStrictEqual(findPlayerByPseudo(html, 'jonathan'), { plid: 2844, pseudo: 'Jonathan' });
    });

    it('parses player games, keeping only finished ones', () => {
        assert.deepStrictEqual(parsePlayerGames(fixture('lg-player-games-2883.json')), {
            finishedGids: [2424182, 2424001, 2418874, 2414658, 2418604],
            hasMore: true,
            count: 5,
        });

        const running = '{"games":[{"gid":2563718,"status":0,"finished_at":0},{"gid":2492796,"status":2,"finished_at":1740945606654}],"total":2,"has_more":false}';

        assert.deepStrictEqual(parsePlayerGames(running), {
            finishedGids: [2492796],
            hasMore: false,
            count: 2,
        });
    });

    it('parses game detail', () => {
        const gameDetail = parseGameDetail(fixture('lg-game-detail-2424182.json'));

        assert.deepStrictEqual(gameDetail.player0, { plid: 3156, pseudo: 'Alan Turing' });
        assert.deepStrictEqual(gameDetail.player1, { plid: 2883, pseudo: 'bennok' });
        assert.strictEqual(gameDetail.startedAt?.toISOString(), '2023-12-16T14:34:23.638Z');
        assert.strictEqual(gameDetail.endedAt?.toISOString(), '2024-04-16T13:13:50.085Z');
        assert.strictEqual(gameDetail.player0Rating, '1652.6');
        assert.strictEqual(gameDetail.player1Rating, '1965.0');

        // 79 moves on Little Golem, last one is resignation
        assert.strictEqual(gameDetail.moveTimestamps.length, 78);
        assert.strictEqual(gameDetail.moveTimestamps[0].toISOString(), '2023-12-16T14:35:19.683Z');
    });

    it('parses game detail of an unrated game', () => {
        const gameDetail = parseGameDetail(fixture('lg-game-detail-2492796-unrated.json'));

        assert.deepStrictEqual(gameDetail.player0, { plid: 175832, pseudo: 'BlackHatNC' });
        assert.strictEqual(gameDetail.player0Rating, null);
        assert.strictEqual(gameDetail.player1Rating, null);
        assert.strictEqual(gameDetail.endedAt?.toISOString(), '2025-03-02T20:00:06.654Z');
        assert.deepStrictEqual(gameDetail.moveTimestamps, []); // resigned before first move
    });

    it('parses game detail of a running game, not ended', () => {
        const gameDetail = parseGameDetail('{"players":[],"status":0,"expire_time":1793861775937,"moves":[{"nmove":0,"plid":1,"movetime":1790173584110}]}');

        assert.strictEqual(gameDetail.player0, null);
        assert.notStrictEqual(gameDetail.startedAt, null);
        assert.strictEqual(gameDetail.endedAt, null);
    });

    it('parses player pseudo from player stats', () => {
        assert.strictEqual(parsePlayerStatsPseudo(fixture('lg-player-stats-44438.json')), 'nytope');
        assert.strictEqual(parsePlayerStatsPseudo('{}'), null);
    });

    it('parses plid from player input', () => {
        assert.strictEqual(parsePlidInput('44438'), 44438);
        assert.strictEqual(parsePlidInput('https://www.littlegolem.net/web/players/44438'), 44438);
        assert.strictEqual(parsePlidInput(' https://www.littlegolem.net/web/players/44438?state=all#game-history '), 44438);
        assert.strictEqual(parsePlidInput('https://www.littlegolem.net/app/#/player/44438'), 44438);
        assert.strictEqual(parsePlidInput('https://www.littlegolem.net/app/#/player/44438/stats/hex/DEFAULT'), 44438);
        assert.strictEqual(parsePlidInput(' https://littlegolem.net/jsp/info/player.jsp?plid=44438 '), 44438);
        assert.strictEqual(parsePlidInput('https://www.littlegolem.net/jsp/info/player_game_list.jsp?gtid=hex&plid=2883'), 2883);
        assert.strictEqual(parsePlidInput('nytope'), null);
        assert.strictEqual(parsePlidInput('player42'), null);
        assert.strictEqual(parsePlidInput('https://example.com/?plid=44438'), null);
        assert.strictEqual(parsePlidInput('https://example.com/web/players/44438'), null);
    });
});

describe('parseLittleGolemHsgf', () => {
    it('parses hsgf with winner and resignation', () => {
        const parsed = parseLittleGolemHsgf(fixture('lg-game-2424182.hsgf'));

        // Alan Turing (PB) played first, bennok (PW) won by resignation
        assert.strictEqual(parsed.player0Name, 'Alan Turing');
        assert.strictEqual(parsed.player1Name, 'bennok');
        assert.strictEqual(parsed.winner, 1);
        assert.strictEqual(parsed.resigned, true);
        assert.strictEqual(parsed.event, 'hex.ld.DEFAULT');
        assert.strictEqual(parsed.boardsize, 13);
        assert.strictEqual(parsed.moves.length, 78);
        assert.strictEqual(parsed.moves[0], 'a4'); // shown as "1.a4" on Little Golem
        assert.strictEqual(parsed.moves[77], 'e6');
    });

    it('parses winner PB', () => {
        const parsed = parseLittleGolemHsgf('(;FF[4]EV[hex.ld.DEFAULT]PB[bennok]PW[Warren Bei]SZ[13]RE[B];W[ac];B[dj];W[ie];B[resign])');

        assert.strictEqual(parsed.winner, 0);
        assert.strictEqual(parsed.resigned, true);
        assert.deepStrictEqual(parsed.moves, ['a3', 'd10', 'i5']);
    });

    it('parses game without moves', () => {
        const parsed = parseLittleGolemHsgf('(;FF[4]EV[hex.ld.DEFAULT]PB[greghe]PW[bennok]SZ[13]RE[W]GC[game #2384695]SO[https://www.littlegolem.net])');

        assert.strictEqual(parsed.winner, 1);
        assert.strictEqual(parsed.resigned, false);
        assert.deepStrictEqual(parsed.moves, []);
    });

    it('ignores EV[null]', () => {
        const parsed = parseLittleGolemHsgf('(;FF[4]EV[null]PB[greghe]PW[bennok]SZ[13]RE[W];W[ac])');

        assert.strictEqual(parsed.event, undefined);
    });

    it('parses unescaped "]" and "\\" in player names', () => {
        // From https://www.littlegolem.net/web/game?id=1804563
        const parsed = parseLittleGolemHsgf('(;FF[4]EV[null]PB[lazy\\player]PW[Shumacher;]]SZ[11]RE[B]GC[game #1804563]SO[https://www.littlegolem.net];W[ad];B[swap];W[eg];B[resign])');

        assert.strictEqual(parsed.player0Name, 'lazy\\player');
        assert.strictEqual(parsed.player1Name, 'Shumacher;]');
        assert.strictEqual(parsed.boardsize, 11);
        assert.deepStrictEqual(parsed.moves, ['a4', 'swap-pieces', 'e7']);
        assert.strictEqual(parsed.resigned, true);
    });

    it('throws if game is not finished (no RE)', () => {
        assert.throws(
            () => parseLittleGolemHsgf('(;FF[4]SZ[13];W[am];B[ii])'),
            LittleGolemGameNotFinishedError,
        );
    });
});
