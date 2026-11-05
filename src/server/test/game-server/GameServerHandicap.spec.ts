import assert from 'assert';
import { describe, it } from 'mocha';
import { v4 as uuidv4 } from 'uuid';
import { Game, GameOptions, Player } from '../../../shared/app/models/index.js';
import { createGame } from '../../../shared/app/models/Game.js';
import GameServer from '../../GameServer.js';
import type { GameEventsEmitter } from '../../services/game-events-emitter/GameEventsEmitter.js';

const createPlayer = (pseudo: string): Player => {
    const player = new Player();

    player.publicId = uuidv4();
    player.pseudo = pseudo;
    player.isBot = false;
    player.isGuest = false;

    return player;
};

const fakeGameEventsEmitter = new Proxy({}, {
    get: () => () => undefined,
}) as GameEventsEmitter;

/**
 * Creates a playing game. Host plays first unless firstPlayer says otherwise.
 */
const createHandicapGame = async (presetHandicap: number, firstPlayer: null | 0 | 1 = 0, rematchedFrom: null | Game = null) => {
    const host = createPlayer('Host');
    const opponent = createPlayer('Opponent');
    const gameOptions = new GameOptions();

    gameOptions.ranked = false;
    gameOptions.presetHandicap = presetHandicap;
    gameOptions.firstPlayer = firstPlayer;

    const game: Game = createGame({ gameOptions, host, rematchedFrom });
    const gameServer = new GameServer(game, { save: () => Promise.resolve(game) }, fakeGameEventsEmitter);

    assert.strictEqual(gameServer.playerJoin(opponent), true);

    // Wait for game to be started (createAndStartGame is async)
    await new Promise(resolve => setImmediate(resolve));

    assert.strictEqual(game.state, 'playing');

    const [red, blue] = gameServer.getPlayers();

    const moves = () => gameServer.getEngineGame()!.getMovesHistory().map(({ move }) => move);

    return { game, gameServer, host, opponent, red, blue, moves };
};

describe('GameServer handicap', () => {
    it('makes blue pass automatically on half handicap', async () => {
        const { game, gameServer, red, moves } = await createHandicapGame(2.5);

        assert.strictEqual(game.swapRule, false);

        assert.strictEqual(gameServer.playerMove(red, 'a1'), true);
        assert.deepStrictEqual(moves(), ['a1', 'pass']);

        assert.strictEqual(gameServer.playerMove(red, 'a2'), true);
        assert.deepStrictEqual(moves(), ['a1', 'pass', 'a2', 'pass']);

        assert.strictEqual(gameServer.playerMove(red, 'a3'), true);
        assert.deepStrictEqual(moves(), ['a1', 'pass', 'a2', 'pass', 'a3'], 'blue plays now');
        assert.strictEqual(gameServer.getHandicapStatus(), null);
    });

    it('lets blue swap or refuse on integer handicap, but not place a stone', async () => {
        const { gameServer, red, blue, moves } = await createHandicapGame(1);

        assert.strictEqual(gameServer.playerMove(red, 'a1'), true);
        assert.deepStrictEqual(moves(), ['a1'], 'no automatic pass: blue must decide');

        assert.strictEqual(typeof gameServer.playerMove(blue, 'b2'), 'string');
        assert.deepStrictEqual(moves(), ['a1']);

        assert.strictEqual(gameServer.playerMove(blue, 'swap-pieces'), true);
        assert.strictEqual(gameServer.playerMove(red, 'c3'), true);
        assert.deepStrictEqual(moves(), ['a1', 'swap-pieces', 'c3', 'pass']);

        assert.strictEqual(gameServer.playerMove(red, 'c4'), true);
        assert.strictEqual(gameServer.getHandicapStatus(), null);
    });

    it('makes red pass when blue has the advantage', async () => {
        // Opponent plays second, so negative handicap can only be for blue here
        const { gameServer, red, blue, moves } = await createHandicapGame(-1);

        assert.strictEqual(gameServer.playerMove(red, 'a1'), true);
        assert.strictEqual(gameServer.getHandicapStatus()?.type, 'stones');

        assert.strictEqual(gameServer.playerMove(blue, 'b2'), true);
        assert.deepStrictEqual(moves(), ['a1', 'b2', 'pass']);

        assert.strictEqual(gameServer.playerMove(blue, 'b3'), true);
        assert.strictEqual(gameServer.getHandicapStatus(), null);
    });

    it('gives advantage to host even when host plays second', async () => {
        const { gameServer, host, red, blue, moves } = await createHandicapGame(1, 1);

        assert.strictEqual(blue.publicId, host.publicId);

        assert.strictEqual(gameServer.playerMove(red, 'a1'), true);
        assert.strictEqual(gameServer.playerMove(blue, 'b2'), true);
        assert.deepStrictEqual(moves(), ['a1', 'b2', 'pass']);
    });

    it('makes player who has the advantage play first on half handicap', async () => {
        const { opponent, red, game } = await createHandicapGame(-1.5, null);

        assert.strictEqual(game.firstPlayer, 1);
        assert.strictEqual(red.publicId, opponent.publicId);
    });

    it('keeps player who has the advantage first on rematch of a canceled game', async () => {
        const canceledGame = createGame();

        canceledGame.state = 'canceled';

        const { opponent, red } = await createHandicapGame(-1.5, null, canceledGame);

        assert.strictEqual(red.publicId, opponent.publicId);
    });

    it('refuses manual pass, premove and undo during handicap setup', async () => {
        const { gameServer, red, blue } = await createHandicapGame(1.5);

        assert.strictEqual(typeof gameServer.playerMove(red, 'pass'), 'string');

        assert.strictEqual(gameServer.playerMove(red, 'a1'), true);

        assert.strictEqual(typeof gameServer.playerMove(red, 'pass'), 'string');
        assert.strictEqual(typeof gameServer.playerAskUndo(red), 'string');
        assert.strictEqual(typeof gameServer.playerPremove(blue, { move: 'b2', moveIndex: 3 }), 'string');

        assert.strictEqual(gameServer.playerMove(red, 'a2'), true);
        assert.strictEqual(typeof gameServer.playerAskUndo(red), 'string', 'would undo a handicap stone');

        assert.strictEqual(gameServer.playerMove(blue, 'b2'), true);
        assert.strictEqual(gameServer.playerMove(red, 'a3'), true);
        assert.strictEqual(gameServer.playerAskUndo(red), true, 'handicap stones not touched');
    });

    it('can cancel until blue placed a stone', async () => {
        const { game, gameServer, red, blue } = await createHandicapGame(1.5);

        assert.strictEqual(gameServer.playerMove(red, 'a1'), true);
        assert.strictEqual(gameServer.playerMove(red, 'a2'), true);
        assert.strictEqual(gameServer.playerCancel(blue), true);
        assert.strictEqual(game.state, 'canceled');
    });

    it('can cancel while handicap stones are being placed', async () => {
        const { game, gameServer, red, blue, moves } = await createHandicapGame(5);

        assert.strictEqual(gameServer.playerMove(red, 'a1'), true);
        assert.strictEqual(gameServer.playerMove(blue, 'pass'), true);
        assert.strictEqual(gameServer.playerMove(red, 'a2'), true);
        assert.strictEqual(gameServer.playerMove(red, 'a3'), true);
        assert.strictEqual(moves().length, 6);
        assert.strictEqual(gameServer.playerCancel(red), true);
        assert.strictEqual(game.state, 'canceled');
    });

    it('cannot cancel anymore when blue passes after handicap setup', async () => {
        const { gameServer, red, blue } = await createHandicapGame(1.5);

        assert.strictEqual(gameServer.playerMove(red, 'a1'), true);
        assert.strictEqual(gameServer.playerMove(red, 'a2'), true);
        assert.strictEqual(gameServer.playerMove(blue, 'pass'), true);
        assert.strictEqual(typeof gameServer.playerCancel(red), 'string');
    });

    it('plays no pass when game has no handicap', async () => {
        const { gameServer, red, moves } = await createHandicapGame(0);

        assert.strictEqual(gameServer.playerMove(red, 'a1'), true);
        assert.deepStrictEqual(moves(), ['a1']);
        assert.strictEqual(gameServer.getHandicapStatus(), null);
    });
});
