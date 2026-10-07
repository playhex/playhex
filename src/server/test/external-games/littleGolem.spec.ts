import assert from 'assert';
import { readFileSync } from 'fs';
import { describe, it } from 'mocha';
import { findPlayerByPseudo, parseGamePage, parseLittleGolemDate, parsePlayerGameList, parsePlayerList, parsePlayerPagePseudo, parsePlidInput } from '../../external-games/little-golem/littleGolemParsers.js';
import { LittleGolemGameNotFinishedError, parseLittleGolemHsgf } from '../../../shared/app/little-golem/littleGolemHsgf.js';

const fixture = (name: string): string => readFileSync(`${import.meta.dirname}/fixtures/${name}`, 'utf8');

describe('Little Golem parsers', () => {
    it('parses player list', () => {
        const html = fixture('lg-player-list.html');

        assert.deepStrictEqual(parsePlayerList(html), [{ plid: 2883, pseudo: 'bennok' }]);
        assert.deepStrictEqual(findPlayerByPseudo(html, 'Bennok '), { plid: 2883, pseudo: 'bennok' });
        assert.strictEqual(findPlayerByPseudo(html, 'benno'), null);
    });

    it('parses player game list', () => {
        assert.deepStrictEqual(
            parsePlayerGameList(fixture('lg-player-game-list.html')),
            [2424182, 2424001, 2418874, 2418604, 2414658],
        );
    });

    it('parses Little Golem dates in central european time', () => {
        assert.strictEqual(parseLittleGolemDate('2023-12-16 09:34')?.toISOString(), '2023-12-16T08:34:00.000Z'); // winter
        assert.strictEqual(parseLittleGolemDate('2024-07-01 09:34')?.toISOString(), '2024-07-01T07:34:00.000Z'); // summer
        assert.strictEqual(parseLittleGolemDate('unknown'), null);
    });

    it('parses game page', () => {
        const gamePage = parseGamePage(fixture('lg-game-2424182.html'));

        assert.deepStrictEqual(gamePage.player0, { plid: 3156, pseudo: 'Alan Turing' });
        assert.deepStrictEqual(gamePage.player1, { plid: 2883, pseudo: 'bennok' });
        assert.strictEqual(gamePage.startedAt?.toISOString(), '2023-12-16T08:34:00.000Z');
        assert.strictEqual(gamePage.endedAt?.toISOString(), '2024-04-16T07:13:00.000Z');
        assert.strictEqual(gamePage.player0Rating, '1653.0');
        assert.strictEqual(gamePage.player1Rating, '1965.0');
    });

    it('parses game page ratings when Little Golem swaps rating and rank', () => {
        // Little Golem randomly renders <span title='5. kyu'/>1870.9</span>
        const gamePage = parseGamePage(fixture('lg-game-2264369-swapped-rating.html'));

        assert.strictEqual(gamePage.player0Rating, '1870.9');
        assert.strictEqual(gamePage.player1Rating, '1519.5');
    });

    it('parses player page', () => {
        assert.strictEqual(parsePlayerPagePseudo(fixture('lg-player-44438.html')), 'nytope');

        // Little Golem returns an empty page for unknown plid
        assert.strictEqual(parsePlayerPagePseudo(''), null);
    });

    it('parses plid from player input', () => {
        assert.strictEqual(parsePlidInput('44438'), 44438);
        assert.strictEqual(parsePlidInput(' https://littlegolem.net/jsp/info/player.jsp?plid=44438 '), 44438);
        assert.strictEqual(parsePlidInput('https://www.littlegolem.net/jsp/info/player_game_list.jsp?gtid=hex&plid=2883'), 2883);
        assert.strictEqual(parsePlidInput('nytope'), null);
        assert.strictEqual(parsePlidInput('player42'), null);
        assert.strictEqual(parsePlidInput('https://example.com/?plid=44438'), null);
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
        // From https://littlegolem.net/jsp/game/game.jsp?gid=1804563
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
