/* eslint-disable require-await, @typescript-eslint/require-await -- in memory fakes of async interfaces */
import assert from 'assert';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Game, GameOptions, Player } from '../../../shared/app/models/index.js';
import { createGame } from '../../../shared/app/models/Game.js';
import MatchmakingStore from '../../matchmaking/MatchmakingStore.js';
import MatchmakingLobbyBridge from '../../matchmaking/MatchmakingLobbyBridge.js';
import type GameStore from '../../store/GameStore.js';
import type OnlinePlayersService from '../../services/OnlinePlayersService.js';
import type PlayerSettingsRepository from '../../repositories/PlayerSettingsRepository.js';
import type MatchmakingEventRepository from '../../matchmaking/MatchmakingEventRepository.js';
import type { HexServer } from '../../server.js';
import type { MatchmakingPreferences } from '../../../shared/app/matchmaking/matchmakingRules.js';
import { notifier } from '../../services/notifications/notifier.js';

let playerId = 0;

const createPlayer = (pseudo: string): Player => {
    const player = new Player();

    player.id = ++playerId;
    player.publicId = `00000000-0000-0000-0000-${String(playerId).padStart(12, '0')}`;
    player.pseudo = pseudo;
    player.isGuest = false;
    player.isBot = false;

    return player;
};

const prefs = (boardsizes: MatchmakingPreferences['boardsizes']): MatchmakingPreferences => ({ boardsizes });

class FakeGameServer
{
    constructor(private game: Game) {}

    getGame() { return this.game; }
    getPublicId() { return this.game.publicId; }
    async persist() { return this.game; }

    playerJoin(player: Player): true | string
    {
        if (this.game.gameToPlayers.length >= 2) {
            return 'game is full';
        }

        this.game.gameToPlayers.push({ player } as Game['gameToPlayers'][number]);

        if (this.game.gameToPlayers.length === 2) {
            this.game.state = 'playing';
        }

        return true;
    }
}

class FakeGameStore
{
    activeGames: { [publicId: string]: FakeGameServer } = {};

    async createGame(params: { gameOptions: GameOptions, host?: null | Player })
    {
        const game = createGame(params);
        game.id = Object.keys(this.activeGames).length + 1;

        // createGame() already adds host in game players
        const gameServer = new FakeGameServer(game);
        this.activeGames[game.publicId] = gameServer;

        return gameServer;
    }

    getActiveGames() { return this.activeGames; }
    getActiveGame(publicId: string) { return this.activeGames[publicId] ?? null; }
}

class FakeOnlinePlayersService extends TypedEmitter<{
    playerConnected: (player: Player) => void;
    playerDisconnected: (player: Player) => void;
}> {
    online = new Set<string>();

    isOnline(player: Player) { return this.online.has(player.publicId); }

    connect(player: Player) { this.online.add(player.publicId); this.emit('playerConnected', player); }
    disconnect(player: Player) { this.online.delete(player.publicId); this.emit('playerDisconnected', player); }
}

type LoggedEvent = { type: string, player: Player, parameters: { [key: string]: unknown }, otherPlayer: null | Player, game: null | Game };

const lobbyGameOptions = (boardsize: number, minutes: number, increment: number): GameOptions => {
    const gameOptions = new GameOptions();

    gameOptions.ranked = true;
    gameOptions.boardsize = boardsize;
    gameOptions.opponentType = 'player';
    gameOptions.timeControlType = { family: 'fischer', options: { initialTime: minutes * 60_000, timeIncrement: increment * 1000 } };

    return gameOptions;
};

describe('MatchmakingStore', () => {
    let gameStore: FakeGameStore;
    let onlinePlayersService: FakeOnlinePlayersService;
    let events: LoggedEvent[];
    let matched: { [publicId: string]: string };
    let store: MatchmakingStore;
    let bridge: MatchmakingLobbyBridge;

    const waitImmediate = () => new Promise(resolve => setImmediate(resolve));

    beforeEach(() => {
        gameStore = new FakeGameStore();
        onlinePlayersService = new FakeOnlinePlayersService();
        events = [];
        matched = {};

        const io = {
            to: (room: string) => ({
                emit: (event: string, ...args: unknown[]) => {
                    if (event === 'matchmakingMatched') {
                        matched[room.replace('players/', '')] = args[0] as string;
                    }
                },
            }),
        };

        const eventRepository = {
            log: (type: string, player: Player, parameters: { [key: string]: unknown }, otherPlayer: null | Player = null, game: null | Game = null) => {
                events.push({ type, player, parameters, otherPlayer, game });
            },
        };

        const playerSettingsRepository = {
            getPlayerSettings: async () => ({}),
            updatePlayerSettings: async () => {},
        };

        store = new MatchmakingStore(
            io as unknown as HexServer,
            gameStore as unknown as GameStore,
            onlinePlayersService as unknown as OnlinePlayersService,
            playerSettingsRepository as unknown as PlayerSettingsRepository,
            eventRepository as unknown as MatchmakingEventRepository,
        );

        bridge = new MatchmakingLobbyBridge(
            store,
            gameStore as unknown as GameStore,
            eventRepository as unknown as MatchmakingEventRepository,
        );

        bridge.listen();
    });

    afterEach(() => {
        notifier.removeAllListeners('gameCreated');
        notifier.removeAllListeners('gameStart');
    });

    const enter = async (player: Player, preferences: MatchmakingPreferences, avoidPlayerId: null | string = null) => {
        onlinePlayersService.online.add(player.publicId);
        return await store.enter(player, preferences, avoidPlayerId);
    };

    it('waits when alone, then matches on a common boardsize', async () => {
        const alice = createPlayer('alice');
        const bob = createPlayer('bob');

        const status = await enter(alice, prefs({ 11: 'yes', 13: 'heart' }));
        assert.ok(status !== null);
        assert.strictEqual(store.getQueueSize(), 1);

        const status2 = await enter(bob, prefs({ 13: 'yes', 19: 'heart' }));
        assert.strictEqual(status2, null);
        assert.strictEqual(store.getQueueSize(), 0);

        const gamePublicId = matched[alice.publicId];
        assert.ok(gamePublicId);
        assert.strictEqual(matched[bob.publicId], gamePublicId);

        const game = gameStore.activeGames[gamePublicId].getGame();
        assert.strictEqual(game.boardsize, 13);
        assert.strictEqual(game.ranked, true);
        assert.strictEqual(game.state, 'playing');
        assert.deepStrictEqual(game.timeControlType, { family: 'fischer', options: { initialTime: 300_000, timeIncrement: 5_000 } });

        const matchEvent = events.find(e => e.type === 'match');
        assert.ok(matchEvent);
        assert.strictEqual(matchEvent.parameters.source, 'queue');
        assert.strictEqual(matchEvent.parameters.tier, 'one_heart');
        assert.strictEqual(matchEvent.otherPlayer, alice);
        assert.strictEqual(matchEvent.game, game);
        assert.strictEqual(events.filter(e => e.type === 'enter').length, 2);
    });

    it('never matches incompatible players', async () => {
        await enter(createPlayer('a'), prefs({ 11: 'yes' }));
        await enter(createPlayer('b'), prefs({ 13: 'heart' }));

        assert.strictEqual(store.getQueueSize(), 2);
        assert.strictEqual(Object.keys(matched).length, 0);
    });

    it('matches with oldest compatible player', async () => {
        const first = createPlayer('first');
        const second = createPlayer('second');
        const third = createPlayer('third');

        await enter(first, prefs({ 11: 'yes' }));
        await enter(second, prefs({ 11: 'yes', 12: 'yes' }));

        // first and second matched together
        assert.strictEqual(store.getQueueSize(), 0);

        await enter(createPlayer('x'), prefs({ 19: 'yes' }));
        await enter(third, prefs({ 11: 'yes' }));
        const fourth = createPlayer('fourth');
        await enter(fourth, prefs({ 11: 'yes', 19: 'yes' }));

        // fourth compatible with x (oldest) and third: matched with x
        assert.ok(matched[fourth.publicId]);
        assert.strictEqual(store.getEntries().map(e => e.player.pseudo).join(), 'third');
    });

    it('avoids last opponent if another one is waiting, else plays him anyway', async () => {
        const me = createPlayer('me');
        const lastOpponent = createPlayer('last');
        const other = createPlayer('other');

        await enter(lastOpponent, prefs({ 11: 'yes' }));
        await enter(other, prefs({ 12: 'yes', 11: 'yes' }));

        // lastOpponent and other matched together, retry with fresh players
        const lastOpponent2 = createPlayer('last2');
        const other2 = createPlayer('other2');

        await enter(lastOpponent2, prefs({ 11: 'yes' }));
        await enter(other2, prefs({ 15: 'yes' }));
        await enter(createPlayer('other3'), prefs({ 11: 'no', 15: 'no', 16: 'yes' }));

        // Only lastOpponent2 compatible on 11 => matched anyway
        await enter(me, prefs({ 11: 'yes', 15: 'yes' }), lastOpponent2.publicId);
        assert.strictEqual(matched[me.publicId], matched[other2.publicId], 'other2 waiting, matched with him instead of avoided lastOpponent2');

        const me2 = createPlayer('me2');
        await enter(me2, prefs({ 11: 'yes' }), lastOpponent2.publicId);
        assert.strictEqual(matched[me2.publicId], matched[lastOpponent2.publicId], 'only avoided player compatible, matched anyway');
        assert.strictEqual(events.find(e => e.type === 'match' && e.player === me2)?.parameters.avoided, true);
    });

    it('updates preferences when entering again, keeps position', async () => {
        const alice = createPlayer('alice');

        const status = await enter(alice, prefs({ 11: 'yes' }));
        const status2 = await enter(alice, prefs({ 19: 'heart' }));

        assert.strictEqual(store.getQueueSize(), 1);
        assert.strictEqual(status2?.enteredAt, status?.enteredAt);
        assert.deepStrictEqual(status2?.preferences, prefs({ 19: 'heart' }));
        assert.strictEqual(events.filter(e => e.type === 'enter').length, 1);
    });

    it('leaves and logs waited time', async () => {
        const alice = createPlayer('alice');

        await enter(alice, prefs({ 11: 'yes' }));
        assert.strictEqual(store.leave(alice, 'cancel'), true);
        assert.strictEqual(store.leave(alice, 'cancel'), false);

        const leaveEvent = events.find(e => e.type === 'leave');
        assert.strictEqual(leaveEvent?.parameters.reason, 'cancel');
        assert.strictEqual(typeof leaveEvent?.parameters.waitedMs, 'number');
    });

    it('stays in queue on quick reconnection, leaves when offline more than 5s', async function () {
        this.timeout(10000);

        const alice = createPlayer('alice');
        const bob = createPlayer('bob');

        await enter(alice, prefs({ 11: 'yes' }));
        await enter(bob, prefs({ 13: 'yes' }));

        // alice refreshes page
        onlinePlayersService.disconnect(alice);
        await new Promise(resolve => setTimeout(resolve, 100));
        onlinePlayersService.connect(alice);

        // bob leaves
        onlinePlayersService.disconnect(bob);

        await new Promise(resolve => setTimeout(resolve, 5200));

        assert.deepStrictEqual(store.getEntries().map(e => e.player.pseudo), ['alice']);
        assert.strictEqual(events.find(e => e.type === 'leave')?.parameters.reason, 'offline');
    });

    it('leaves queue when starting another live game', async () => {
        const alice = createPlayer('alice');
        await enter(alice, prefs({ 11: 'yes' }));

        const game = (await gameStore.createGame({ gameOptions: lobbyGameOptions(11, 10, 0), host: createPlayer('host') })).getGame();
        game.opponentType = 'player';
        game.gameToPlayers.push({ player: alice } as Game['gameToPlayers'][number]);
        game.state = 'playing';

        notifier.emit('gameStart', game);

        assert.strictEqual(store.getQueueSize(), 0);
        assert.strictEqual(events.find(e => e.type === 'leave')?.parameters.reason, 'other_game');
    });

    describe('lobby bridge', () => {
        it('joins an existing compatible lobby game when entering queue', async () => {
            const host = createPlayer('host');
            const alice = createPlayer('alice');

            await gameStore.createGame({ gameOptions: lobbyGameOptions(13, 5, 8), host });
            await enter(alice, prefs({ 13: 'yes' }));

            const gamePublicId = matched[alice.publicId];
            assert.ok(gamePublicId);
            assert.strictEqual(gameStore.activeGames[gamePublicId].getGame().state, 'playing');
            assert.strictEqual(store.getQueueSize(), 0);

            await waitImmediate();
            const matchEvent = events.find(e => e.type === 'match');
            assert.strictEqual(matchEvent?.parameters.source, 'lobby_game');
            assert.strictEqual(matchEvent?.otherPlayer, host);
        });

        it('makes waiting player join a lobby game created after', async () => {
            const alice = createPlayer('alice');
            const host = createPlayer('host');

            await enter(alice, prefs({ 11: 'yes' }));

            const gameServer = await gameStore.createGame({ gameOptions: lobbyGameOptions(11, 5, 5), host });
            notifier.emit('gameCreated', gameServer.getGame());
            await waitImmediate();

            assert.strictEqual(matched[alice.publicId], gameServer.getPublicId());
            assert.strictEqual(gameServer.getGame().state, 'playing');
        });

        it('ignores lobby games with refused boardsize, far time control, unranked, or challenges', async () => {
            const alice = createPlayer('alice');
            await enter(alice, prefs({ 11: 'yes' }));

            const unranked = lobbyGameOptions(11, 5, 5);
            unranked.ranked = false;

            const challenge = lobbyGameOptions(11, 5, 5);
            challenge.opponentPublicId = createPlayer('target').publicId;

            for (const gameOptions of [
                lobbyGameOptions(13, 5, 5),
                lobbyGameOptions(11, 1, 0),
                lobbyGameOptions(11, 30, 0),
                unranked,
                challenge,
            ]) {
                const gameServer = await gameStore.createGame({ gameOptions, host: createPlayer('host') });
                notifier.emit('gameCreated', gameServer.getGame());
            }

            await waitImmediate();

            assert.strictEqual(matched[alice.publicId], undefined);
            assert.strictEqual(store.getQueueSize(), 1);
        });

        it('does not join own lobby game', async () => {
            const alice = createPlayer('alice');

            await gameStore.createGame({ gameOptions: lobbyGameOptions(11, 5, 5), host: alice });
            await enter(alice, prefs({ 11: 'yes' }));

            assert.strictEqual(store.getQueueSize(), 1);
        });
    });
});
