import assert from 'assert';
import { describe, it } from 'mocha';
import { v4 as uuidv4 } from 'uuid';
import { Game, GameOptions, GameToPlayer, Player } from '../../../shared/app/models/index.js';
import { createGame } from '../../../shared/app/models/Game.js';
import GameStore, { AlreadyHaveOpenChallengeAgainstThisPlayerError } from '../../store/GameStore.js';

const createPlayer = (pseudo: string): Player => {
    const player = new Player();

    player.publicId = uuidv4();
    player.pseudo = pseudo;
    player.isBot = false;
    player.isGuest = false;

    return player;
};

const createChallengeGameOptions = (opponent: Player): GameOptions => {
    const gameOptions = new GameOptions();

    gameOptions.opponentType = 'player';
    gameOptions.opponentPublicId = opponent.publicId;

    return gameOptions;
};

let gameId = 0;

/**
 * A finished game issued from a nominative challenge, host vs opponent.
 */
const createEndedChallengeGame = (host: Player, opponent: Player): Game => {
    const game = createGame({ gameOptions: createChallengeGameOptions(opponent), host });

    const gameToPlayer = new GameToPlayer();

    gameToPlayer.game = game;
    gameToPlayer.player = opponent;
    gameToPlayer.order = 1;

    game.gameToPlayers.push(gameToPlayer);

    game.id = ++gameId;
    game.state = 'ended';
    game.rematch = null;

    return game;
};

/**
 * GameStore instance without its dependencies on database, socket.io and notifications.
 * Constructor is bypassed on purpose: it loads active games from database.
 */
const createGameStoreWithArchivedGames = (players: Player[], archivedGames: Game[]): GameStore => {
    const gameStore = Object.create(GameStore.prototype) as GameStore;

    Object.assign(gameStore, {
        activeGames: {},
        persistWhenNoActivity: {},
        pendingChallengeKeys: new Set<string>(),

        gameRepository: {
            findUnique: (publicId: string) => Promise.resolve(archivedGames.find(game => game.publicId === publicId) ?? null),
            persist: async () => {},
            persistMultiple: async () => {},
        },
        onlinePlayerService: {
            notifyPlayerActivity: () => {},
        },
        gameEventEmitter: {
            emitGameCreated: () => {},
            emitGameChallengeCreated: () => {},
            emitRematchAvailable: () => {},
        },
        playerIdentityMap: {
            resolve: (player: Player) => player,
        },
        playerRepository: {
            findOne: ({ where: { publicId } }: { where: { publicId: string } }) =>
                Promise.resolve(players.find(player => player.publicId === publicId) ?? null),
        },
    });

    return gameStore;
};

/**
 * We cannot challenge a player directly twice,
 * but it must not prevent Rematch a game.
 *
 * So we must be sure that Rematch always works,
 * even if we already have a pending challenge against this player.
 */
describe('GameStore rematch', () => {
    it('can rematch two finished games against a same opponent', async () => {
        // Two players who finished two games together.
        // Both games came from a nominative challenge, so rematches are challenges too.
        const playerA = createPlayer('Player A');
        const playerB = createPlayer('Player B');

        const game0 = createEndedChallengeGame(playerA, playerB);
        const game1 = createEndedChallengeGame(playerA, playerB);

        const gameStore = createGameStoreWithArchivedGames([playerA, playerB], [game0, game1]);

        // Player A sends a rematch offer on the first game. Player B has not accepted it yet,
        // so it stays an open challenge from A to B.
        const rematch0 = await gameStore.rematchGame(playerA, game0.publicId);

        assert.strictEqual(rematch0.state, 'created');
        assert.strictEqual(rematch0.opponentPublicId, playerB.publicId);

        // Then player A sends a rematch offer on the second game, still against player B.
        // This must be allowed: a rematch is tied to a finished game, it is not a new
        // unrelated challenge, so the "one open challenge per opponent" rule must not block it.
        // Regression: this used to throw AlreadyHaveOpenChallengeAgainstThisPlayerError,
        // returned to the client as an empty HTTP 400 error.
        const rematch1 = await gameStore.rematchGame(playerA, game1.publicId);

        assert.strictEqual(rematch1.state, 'created');
        assert.strictEqual(rematch1.opponentPublicId, playerB.publicId);
        assert.notStrictEqual(rematch0.publicId, rematch1.publicId, 'both rematches are distinct games');
    });

    it('still prevents creating twice a same challenge against a same opponent', async () => {
        const playerA = createPlayer('Player A');
        const playerB = createPlayer('Player B');

        const gameStore = createGameStoreWithArchivedGames([playerA, playerB], []);

        const createOptions = { persist: false, aiJoinAuto: false };

        await gameStore.createGame({ gameOptions: createChallengeGameOptions(playerB), host: playerA }, createOptions);

        await assert.rejects(
            gameStore.createGame({ gameOptions: createChallengeGameOptions(playerB), host: playerA }, createOptions),
            (e: Error) => {
                assert.ok(e instanceof AlreadyHaveOpenChallengeAgainstThisPlayerError);
                assert.notStrictEqual(e.message, '', 'error must have a message, else client receives an empty 400 error');

                return true;
            },
        );
    });
});
