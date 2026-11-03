import { gameToHexworldLink, parseHexworldString, shortenHexworldLink } from '../hexworld.js';
import { EngineGame } from '../../game-engine/index.js';
import { describe, it } from 'mocha';
import assert from 'assert';
import { assignEngineGameData } from '../gameUtils.js';
import { Game } from '../models/index.js';

describe('hexworld', () => {
    it('generates review link from game', () => {
        const engineGame = new EngineGame(9);

        engineGame.move('e5', 0);
        engineGame.move('g6', 1);
        engineGame.move('c6', 0);
        engineGame.move('i9', 1);
        engineGame.move('b3', 0);

        const game = new Game();
        assignEngineGameData(game, engineGame.toData());

        const link = gameToHexworldLink(game);

        assert.strictEqual(link, 'https://hexworld.org/board/#9r9c1,e5g6c6i9b3');
    });

    it('generates review link from game having a swap pieces move', () => {
        const engineGame = new EngineGame(9);

        engineGame.move('b3', 0);
        engineGame.move('swap-pieces', 1);
        engineGame.move('c6', 0);
        engineGame.move('i9', 1);
        engineGame.move('c4', 0);

        const game = new Game();
        assignEngineGameData(game, engineGame.toData());

        const link = gameToHexworldLink(game);

        assert.strictEqual(link, 'https://hexworld.org/board/#9r9c1,b3:sc6i9c4');
    });

    it('generates review link from game having a pass move', () => {
        const engineGame = new EngineGame(9);

        engineGame.move('b3', 0);
        engineGame.move('swap-pieces', 1);
        engineGame.move('c6', 0);
        engineGame.move('i9', 1);
        engineGame.move('pass', 0);

        const game = new Game();
        assignEngineGameData(game, engineGame.toData());

        const link = gameToHexworldLink(game);

        assert.strictEqual(link, 'https://hexworld.org/board/#9r9c1,b3:sc6i9:p');
    });

    it('generates review link from a resigned game', () => {
        const engineGame = new EngineGame(9);

        engineGame.move('b3', 0);
        engineGame.move('swap-pieces', 1);
        engineGame.move('c6', 0);
        engineGame.resign(1, new Date());

        const game = new Game();
        assignEngineGameData(game, engineGame.toData());

        const link = gameToHexworldLink(game);

        assert.strictEqual(link, 'https://hexworld.org/board/#9r9c1,b3:sc6:rw');
    });

    it('generates review link from a timed out game', () => {
        const engineGame = new EngineGame(11);

        engineGame.move('b3', 0);
        engineGame.move('c11', 1);
        engineGame.loseByTime(new Date());

        const game = new Game();
        assignEngineGameData(game, engineGame.toData());

        const link = gameToHexworldLink(game);

        assert.strictEqual(link, 'https://hexworld.org/board/#11r9c1,b3c11:fb');
    });

    it('generates a review link for the "Flat" board rotation', () => {
        const engineGame = new EngineGame(11);
        engineGame.move('c2', 0);
        engineGame.move('d4', 1);
        engineGame.move('c6', 0);
        engineGame.resign(1, new Date());

        const game = new Game();
        assignEngineGameData(game, engineGame.toData());

        const link = gameToHexworldLink(game, 0);

        assert.strictEqual(link, 'https://hexworld.org/board/#11c1,c2d4c6:rw');
    });

    describe('parseHexworldString', () => {
        it('parse simple', () => {
            const parsed = parseHexworldString('9r9c1,e5g6c6i9b3');

            assert.strictEqual(parsed.size, 9);
            assert.deepStrictEqual(parsed.moves, ['e5', 'g6', 'c6', 'i9', 'b3']);
        });

        it('parse boardsize only', () => {
            const parsed = parseHexworldString('11,e5g6c6i9b3');

            assert.strictEqual(parsed.size, 11);
            assert.deepStrictEqual(parsed.moves, ['e5', 'g6', 'c6', 'i9', 'b3']);
        });

        it('parse swap and pass', () => {
            const parsed = parseHexworldString('9r9c1,e5:sc6:pb3');

            assert.strictEqual(parsed.size, 9);
            assert.deepStrictEqual(parsed.moves, ['e5', 'swap-pieces', 'c6', 'pass', 'b3']);
        });

        it('ignore resign', () => {
            const parsed = parseHexworldString('9r9c1,e5g6c6i9b3:rw');

            assert.strictEqual(parsed.size, 9);
            assert.deepStrictEqual(parsed.moves, ['e5', 'g6', 'c6', 'i9', 'b3']);
        });

        it('throws when board is not square', () => {
            assert.throws(() => parseHexworldString('11x5,d2e3'));
        });
    });

    describe('shortenHexworldLink', () => {
        it('keeps board size, 2 first and 2 last moves', () => {
            assert.strictEqual(
                shortenHexworldLink('https://hexworld.org/board/#14r9c1,a14e4k4j11g9k2l2k3l3:pj6i7h6:pf2:pm8:pn7:pl5'),
                'hexworld.org/14,a14e4..:pn7:pl5',
            );
            assert.strictEqual(
                shortenHexworldLink('https://hexworld.org/board/#15c1,e6:sf7i8g10j10l6i4h3'),
                'hexworld.org/15,e6:sf7..i4h3',
            );
        });

        it('does not truncate short move lists', () => {
            assert.strictEqual(shortenHexworldLink('https://hexworld.org/board/#11c1,a1b2c3d4'), 'hexworld.org/11,a1b2c3d4');
            assert.strictEqual(shortenHexworldLink('https://hexworld.org/board/#11c1,'), 'hexworld.org/11');
            assert.strictEqual(shortenHexworldLink('https://hexworld.org/board/#11'), 'hexworld.org/11');
        });

        it('handles cursor comma', () => {
            assert.strictEqual(shortenHexworldLink('https://hexworld.org/board/#11c1,h4e7f9,b9c3'), 'hexworld.org/11,h4e7..b9c3');
        });

        it('returns null for non hexworld board links', () => {
            assert.strictEqual(shortenHexworldLink('https://hexworld.org/'), null);
            assert.strictEqual(shortenHexworldLink('https://example.com/board/#11c1,a1'), null);
        });
    });
});
