import assert from 'assert';
import { describe, it } from 'mocha';
import { v4 as uuidv4 } from 'uuid';
import { Game, Player } from '../../../shared/app/models/index.js';
import { createGame } from '../../../shared/app/models/Game.js';
import GameServer from '../../GameServer.js';
import type { GameEventsEmitter } from '../../services/game-events-emitter/GameEventsEmitter.js';

const createPlayer = (pseudo: string, isBot = false): Player => {
    const player = new Player();

    player.publicId = uuidv4();
    player.pseudo = pseudo;
    player.isBot = isBot;
    player.isGuest = false;

    return player;
};

/**
 * Game events emitter that does not need socket.io, and records emitted events names.
 */
const createFakeGameEventsEmitter = (emitted: string[]): GameEventsEmitter => new Proxy({}, {
    get: (_, name: string) => () => {
        emitted.push(name);
    },
}) as GameEventsEmitter;

/**
 * Creates a playing game between two players, with some moves already played.
 */
const createPlayingGameServer = async (movesCount: number, opponentIsBot = false) => {
    const playerA = createPlayer('Player A');
    const playerB = createPlayer('Player B', opponentIsBot);
    const game: Game = createGame({ host: playerA });

    game.firstPlayer = 0;

    if (opponentIsBot) {
        game.opponentType = 'ai';
    }

    const emitted: string[] = [];
    const gameServer = new GameServer(game, { save: async () => game }, createFakeGameEventsEmitter(emitted));

    assert.strictEqual(gameServer.playerJoin(playerB), true);

    // Wait for game to be started (createAndStartGame is async)
    await new Promise(resolve => setImmediate(resolve));

    assert.strictEqual(game.state, 'playing');

    const [first, second] = gameServer.getPlayers();

    for (let i = 0; i < movesCount; ++i) {
        assert.strictEqual(gameServer.playerMove(i % 2 === 0 ? first : second, 'a' + (i + 1) as 'a1'), true);
    }

    return { game, gameServer, first, second, emitted };
};

describe('GameServer cancel request', () => {
    it('cancels the game with "mutual" reason when opponent accepts', async () => {
        const { game, gameServer, first, second } = await createPlayingGameServer(4);

        assert.strictEqual(gameServer.playerAskCancel(first), true);
        assert.strictEqual(game.cancelRequest, 0);

        assert.strictEqual(gameServer.playerAnswerCancel(second, true), true);
        assert.strictEqual(game.state, 'canceled');
        assert.strictEqual(game.cancelReason, 'mutual');
        assert.strictEqual(game.cancelRequest, null);
    });

    it('keeps the game playing when opponent rejects', async () => {
        const { game, gameServer, first, second } = await createPlayingGameServer(4);

        assert.strictEqual(gameServer.playerAskCancel(first), true);
        assert.strictEqual(gameServer.playerAnswerCancel(second, false), true);

        assert.strictEqual(game.state, 'playing');
        assert.strictEqual(game.cancelRequest, null);
    });

    it('cannot answer own cancel request, nor answer when there is no request', async () => {
        const { gameServer, first, second } = await createPlayingGameServer(4);

        assert.notStrictEqual(gameServer.playerAnswerCancel(second, true), true);

        assert.strictEqual(gameServer.playerAskCancel(first), true);
        assert.notStrictEqual(gameServer.playerAnswerCancel(first, true), true);
        assert.notStrictEqual(gameServer.playerAskCancel(second), true, 'there is already a cancel request');
    });

    it('expires cancel request when a move is played', async () => {
        const { game, gameServer, first, second, emitted } = await createPlayingGameServer(4);

        assert.strictEqual(gameServer.playerAskCancel(first), true);
        assert.strictEqual(gameServer.playerMove(first, 'b5'), true);

        assert.strictEqual(game.cancelRequest, null);
        assert.ok(emitted.includes('emitCancelRequestExpired'));
        assert.notStrictEqual(gameServer.playerAnswerCancel(second, true), true);
        assert.strictEqual(game.state, 'playing');
    });

    it('cannot ask again at the same position after a rejection, but can after a new move', async () => {
        const { gameServer, first, second } = await createPlayingGameServer(4);

        assert.strictEqual(gameServer.playerAskCancel(first), true);
        assert.strictEqual(gameServer.playerAnswerCancel(second, false), true);
        assert.notStrictEqual(gameServer.playerAskCancel(first), true);

        // Opponent can still ask at this position
        assert.strictEqual(gameServer.playerAskCancel(second), true);
        assert.strictEqual(gameServer.playerAnswerCancel(first, false), true);

        assert.strictEqual(gameServer.playerMove(first, 'b5'), true);
        assert.strictEqual(gameServer.playerAskCancel(first), true);
    });

    it('cannot ask cancel in a ladder game', async () => {
        const { game, gameServer, first } = await createPlayingGameServer(4);

        game.ladderChallenge = {} as Game['ladderChallenge'];

        assert.notStrictEqual(gameServer.playerAskCancel(first), true);
    });

    it('cannot ask cancel in a bot game', async () => {
        const { gameServer, first, second } = await createPlayingGameServer(0, true);
        const human = first.isBot ? second : first;

        assert.notStrictEqual(gameServer.playerAskCancel(human), true);
    });
});
