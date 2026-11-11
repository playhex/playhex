import assert from 'assert';
import { describe, it } from 'mocha';
import { v4 as uuidv4 } from 'uuid';
import { Game, GameOptions, GameToPlayer, LadderChallenge, Player, TournamentMatch } from '../../../shared/app/models/index.js';
import { createGame } from '../../../shared/app/models/Game.js';
import { isPublicLiveLobbyGame } from '../../../shared/app/gameUtils.js';
import GameStore from '../../store/GameStore.js';
import GameServer from '../../GameServer.js';
import type { CancelGameReason } from '../../../shared/app/Types.js';

const correspondence = { family: 'fischer', options: { initialTime: 86400 * 3 * 1000, timeIncrement: 0 } } as const;

const createPlayer = (): Player => {
    const player = new Player();

    player.publicId = uuidv4();
    player.pseudo = 'Player';
    player.isBot = false;
    player.isGuest = false;

    return player;
};

const createWaitingGame = (host: Player, options: Partial<GameOptions> = {}, extra: Partial<Game> = {}): Game => {
    const game = createGame({
        gameOptions: Object.assign(new GameOptions(), { opponentType: 'player' }, options),
        host,
    });

    return Object.assign(game, extra);
};

const startGame = (game: Game, joiner: Player): Game => {
    const gameToPlayer = new GameToPlayer();

    gameToPlayer.game = game;
    gameToPlayer.player = joiner;
    gameToPlayer.order = 1;

    game.gameToPlayers.push(gameToPlayer);
    game.state = 'playing';
    game.startedAt = new Date();

    return game;
};

type FakeGameServer = { getGame: () => Game, canceled: null | CancelGameReason };

const fakeGameServer = (game: Game): FakeGameServer => {
    const fake: FakeGameServer = {
        getGame: () => game,
        canceled: null,
    };

    Object.assign(fake, {
        systemCancel: (reason: CancelGameReason) => {
            fake.canceled = reason;
        },
    });

    return fake;
};

/**
 * Simulates startedGame starting, with other games active in store.
 * Returns cancel reason of each other game, or null if not canceled.
 */
const runOnStarted = (startedGame: Game, others: Game[]): (null | CancelGameReason)[] => {
    const servers = [startedGame, ...others].map(fakeGameServer);
    const gameStore = Object.create(GameStore.prototype) as GameStore;

    Object.assign(gameStore, {
        activeGames: Object.fromEntries(servers.map(server => [server.getGame().publicId, server])),
    });

    (gameStore as unknown as { cancelOtherLobbyGamesOfPlayers: (gameServer: GameServer) => void })
        .cancelOtherLobbyGamesOfPlayers(servers[0] as unknown as GameServer);

    assert.strictEqual(servers[0].canceled, null, 'started game must not be canceled');

    return servers.slice(1).map(server => server.canceled);
};

describe('Cancel other lobby games when one is accepted', () => {
    describe('isPublicLiveLobbyGame', () => {
        const host = createPlayer();

        it('is true for a default live game against a player', () => {
            assert.strictEqual(isPublicLiveLobbyGame(createWaitingGame(host)), true);
        });

        it('is false for bot, correspondence, challenge, closed, tournament and ladder games', () => {
            assert.strictEqual(isPublicLiveLobbyGame(createWaitingGame(host, { opponentType: 'ai' })), false);
            assert.strictEqual(isPublicLiveLobbyGame(createWaitingGame(host, { timeControlType: correspondence })), false);
            assert.strictEqual(isPublicLiveLobbyGame(createWaitingGame(host, { opponentPublicId: uuidv4() })), false);
            assert.strictEqual(isPublicLiveLobbyGame(createWaitingGame(host, { closed: true })), false);
            assert.strictEqual(isPublicLiveLobbyGame(createWaitingGame(host, {}, { tournamentMatch: new TournamentMatch() })), false);
            assert.strictEqual(isPublicLiveLobbyGame(createWaitingGame(host, {}, { ladderChallenge: new LadderChallenge() })), false);
        });
    });

    it('cancels second created game of host when the first one is accepted', () => {
        const host = createPlayer();
        const started = startGame(createWaitingGame(host), createPlayer());

        assert.deepStrictEqual(runOnStarted(started, [createWaitingGame(host)]), ['host_playing']);
    });

    it('cancels waiting game of a player who joined another lobby game', () => {
        const joiner = createPlayer();
        const started = startGame(createWaitingGame(createPlayer()), joiner);

        assert.deepStrictEqual(runOnStarted(started, [createWaitingGame(joiner)]), ['host_playing']);
    });

    it('does not cancel games that are not public live lobby games, or of other players, or already playing', () => {
        const host = createPlayer();
        const started = startGame(createWaitingGame(host), createPlayer());

        assert.deepStrictEqual(runOnStarted(started, [
            createWaitingGame(host, { timeControlType: correspondence }),
            createWaitingGame(host, { opponentPublicId: uuidv4() }),
            createWaitingGame(host, { closed: true }),
            createWaitingGame(host, {}, { tournamentMatch: new TournamentMatch() }),
            createWaitingGame(host, {}, { ladderChallenge: new LadderChallenge() }),
            createWaitingGame(host, { opponentType: 'ai' }),
            createWaitingGame(createPlayer()),
            startGame(createWaitingGame(host), createPlayer()),
        ]), [null, null, null, null, null, null, null, null]);
    });

    it('does nothing when started game is not a public live lobby game', () => {
        const host = createPlayer();
        const startedGames = [
            createWaitingGame(host, { opponentType: 'ai' }),
            createWaitingGame(host, { timeControlType: correspondence }),
            createWaitingGame(host, { opponentPublicId: uuidv4() }),
            createWaitingGame(host, { closed: true }),
            createWaitingGame(host, {}, { tournamentMatch: new TournamentMatch() }),
            createWaitingGame(host, {}, { ladderChallenge: new LadderChallenge() }),
        ];

        for (const startedGame of startedGames) {
            const started = startGame(startedGame, createPlayer());

            assert.deepStrictEqual(runOnStarted(started, [createWaitingGame(host)]), [null]);
        }
    });
});
