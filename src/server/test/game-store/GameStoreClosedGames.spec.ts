import assert from 'assert';
import { afterEach, describe, it } from 'mocha';
import { Container } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { Game, GameOptions, Player } from '../../../shared/app/models/index.js';
import { createGame } from '../../../shared/app/models/Game.js';
import { isWaitingClosedGame } from '../../../shared/app/gameUtils.js';
import GameStore from '../../store/GameStore.js';
import { GameEventsEmitter } from '../../services/game-events-emitter/GameEventsEmitter.js';
import { HexServer } from '../../server.js';
import Rooms from '../../../shared/app/Rooms.js';

const createPlayer = (): Player => {
    const player = new Player();

    player.publicId = uuidv4();
    player.pseudo = 'Player';
    player.isBot = false;
    player.isGuest = false;

    return player;
};

const createWaitingGame = (options: Partial<GameOptions> = {}): Game => {
    return createGame({
        gameOptions: Object.assign(new GameOptions(), { opponentType: 'player' }, options),
        host: createPlayer(),
    });
};

const createGameStoreWithActiveGames = (games: Game[]): GameStore => {
    const gameStore = Object.create(GameStore.prototype) as GameStore;

    Object.assign(gameStore, {
        activeGames: Object.fromEntries(games.map(game => [game.publicId, { getGame: () => game }])),
    });

    return gameStore;
};

/**
 * Records in which rooms each event has been emitted.
 * An empty rooms list means event has been broadcasted to all sockets.
 */
const spyEmittedRooms = (): { [event: string]: string[][] } => {
    const emitted: { [event: string]: string[][] } = {};

    Container.set(HexServer, {
        to: (rooms: string[]) => ({
            emit: (event: string) => {
                (emitted[event] ??= []).push(rooms);
            },
        }),
    });

    return emitted;
};

describe('Closed games', () => {
    // Other specs share this container and have set their own HexServer: give it back
    const previousHexServer = Container.has(HexServer) ? Container.get(HexServer) : null;

    afterEach(() => {
        if (previousHexServer !== null) {
            Container.set(HexServer, previousHexServer);
        } else {
            Container.remove(HexServer);
        }
    });

    describe('isWaitingClosedGame', () => {
        it('is public by default', () => {
            assert.strictEqual(isWaitingClosedGame(createWaitingGame()), false);
        });

        it('is hidden only while waiting for an opponent', () => {
            const game = createWaitingGame({ closed: true });

            assert.strictEqual(isWaitingClosedGame(game), true);

            game.state = 'playing';

            assert.strictEqual(isWaitingClosedGame(game), false);
        });
    });

    describe('Lobby list', () => {
        it('does not contain waiting closed games', () => {
            const publicGame = createWaitingGame();
            const closedGame = createWaitingGame({ closed: true });

            const gameStore = createGameStoreWithActiveGames([publicGame, closedGame]);

            assert.deepStrictEqual(gameStore.getWaiting1v1GamesData(), [publicGame]);
        });
    });

    describe('lobbyGameCreated event', () => {
        const emitGameCreated = (game: Game): string[][] | undefined => {
            const emitted = spyEmittedRooms();

            new GameEventsEmitter().emitGameCreated(game);

            return emitted.lobbyGameCreated;
        };

        it('is not emitted for closed games, not even to all sockets', () => {
            assert.strictEqual(emitGameCreated(createWaitingGame({ closed: true })), undefined);
        });

        it('is emitted to lobby for public games', () => {
            assert.deepStrictEqual(emitGameCreated(createWaitingGame()), [['lobby']]);
        });

        it('is emitted only to players of a challenge', () => {
            const opponent = createPlayer();
            const game = createWaitingGame({ opponentPublicId: opponent.publicId });

            const rooms = emitGameCreated(game);

            assert.strictEqual(rooms?.length, 1);
            assert.ok(rooms[0].some(room => room.includes(opponent.publicId)), 'target must see it in lobby');
            assert.ok(!rooms[0].includes('lobby'));
        });

        it('is emitted only to players of a challenge that is also closed, like a rematch of a closed game', () => {
            const opponent = createPlayer();
            const game = createWaitingGame({ opponentPublicId: opponent.publicId, closed: true });

            const rooms = emitGameCreated(game);

            assert.ok(rooms?.[0].some(room => room.includes(opponent.publicId)));
            assert.ok(!rooms?.[0].includes('lobby'));
        });
    });

    describe('gameCanceled event', () => {
        const emitGameCanceled = (game: Game): string[] | undefined => {
            const emitted = spyEmittedRooms();

            game.state = 'canceled';

            new GameEventsEmitter().emitGameCanceled(game, { date: new Date() });

            return emitted.gameCanceled?.[0];
        };

        it('is not emitted to lobby for a closed game that never started', () => {
            const game = createWaitingGame({ closed: true });

            const rooms = emitGameCanceled(game);

            assert.ok(rooms?.includes(Rooms.game(game.publicId)));
            assert.ok(!rooms?.includes(Rooms.lobby));
        });

        it('is emitted to lobby for a closed game that started, it was public then', () => {
            const game = createWaitingGame({ closed: true });

            game.startedAt = new Date();

            assert.ok(emitGameCanceled(game)?.includes(Rooms.lobby));
        });

        it('is emitted to lobby for public games', () => {
            assert.ok(emitGameCanceled(createWaitingGame())?.includes(Rooms.lobby));
        });
    });
});
