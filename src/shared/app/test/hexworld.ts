import { gameToHexworldLink, parseHexworldString } from '../hexworld.js';
import { Game } from '../../game-engine/index.js';
import { describe, it } from 'mocha';
import assert from 'assert';
import { assignEngineGameData } from '../hostedGameUtils.js';
import { HostedGame } from '../models/index.js';

describe('hexworld', () => {
    it('generates review link from game', () => {
        const game = new Game(9);

        game.move('e5', 0);
        game.move('c6', 1);
        game.move('b3', 0);
        game.move('d2', 1);
        game.move('a9', 0);

        const hostedGame = new HostedGame();
        assignEngineGameData(hostedGame, game.toData());

        const link = gameToHexworldLink(hostedGame);

        assert.strictEqual(link, 'https://hexanna1.github.io/hex-study/y.html#9r9c1,e5c6b3d2a9');
    });

    it('generates review link from game having a swap pieces move', () => {
        const game = new Game(9);

        game.move('b3', 0);
        game.move('swap-pieces', 1);
        game.move('c6', 0);
        game.move('d2', 1);
        game.move('c4', 0);

        const hostedGame = new HostedGame();
        assignEngineGameData(hostedGame, game.toData());

        const link = gameToHexworldLink(hostedGame);

        assert.strictEqual(link, 'https://hexanna1.github.io/hex-study/y.html#9r9c1,b3:sc6d2c4');
    });

    it('generates review link from game having a pass move', () => {
        const game = new Game(9);

        game.move('b3', 0);
        game.move('swap-pieces', 1);
        game.move('c6', 0);
        game.move('d2', 1);
        game.move('pass', 0);

        const hostedGame = new HostedGame();
        assignEngineGameData(hostedGame, game.toData());

        const link = gameToHexworldLink(hostedGame);

        assert.strictEqual(link, 'https://hexanna1.github.io/hex-study/y.html#9r9c1,b3:sc6d2:p');
    });

    it('generates review link from a resigned game', () => {
        const game = new Game(9);

        game.move('b3', 0);
        game.move('swap-pieces', 1);
        game.move('c6', 0);
        game.resign(1, new Date());

        const hostedGame = new HostedGame();
        assignEngineGameData(hostedGame, game.toData());

        const link = gameToHexworldLink(hostedGame);

        assert.strictEqual(link, 'https://hexanna1.github.io/hex-study/y.html#9r9c1,b3:sc6:rw');
    });

    it('generates review link from a timed out game', () => {
        const game = new Game(11);

        game.move('b3', 0);
        game.move('c9', 1);
        game.loseByTime(new Date());

        const hostedGame = new HostedGame();
        assignEngineGameData(hostedGame, game.toData());

        const link = gameToHexworldLink(hostedGame);

        assert.strictEqual(link, 'https://hexanna1.github.io/hex-study/y.html#11r9c1,b3c9:fb');
    });

    it('generates a review link for the "Flat" board rotation', () => {
        const game = new Game(11);
        game.move('c2', 0);
        game.move('d4', 1);
        game.move('c6', 0);
        game.resign(1, new Date());

        const hostedGame = new HostedGame();
        assignEngineGameData(hostedGame, game.toData());

        const link = gameToHexworldLink(hostedGame, 0);

        assert.strictEqual(link, 'https://hexanna1.github.io/hex-study/y.html#11c1,c2d4c6:rw');
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
});
