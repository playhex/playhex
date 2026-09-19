import assert from 'assert';
import { describe, it } from 'mocha';
import { v4 as uuidv4 } from 'uuid';
import { Game, GameChatSubscription, GameToPlayer, Player } from '../../../shared/app/models/index.js';
import GameChatNotificationService from '../../services/GameChatNotificationService.js';
import GameChatSubscriptionRepository from '../../repositories/GameChatSubscriptionRepository.js';

let playerId = 0;

const createPlayer = (pseudo: string): Player => {
    const player = new Player();

    player.id = ++playerId;
    player.publicId = uuidv4();
    player.pseudo = pseudo;

    return player;
};

const createGameWithPlayers = (...players: Player[]): Game => {
    const game = new Game();

    game.id = 1;
    game.publicId = uuidv4();
    game.host = null;
    game.gameToPlayers = players.map((player, order) => {
        const gameToPlayer = new GameToPlayer();

        gameToPlayer.game = game;
        gameToPlayer.player = player;
        gameToPlayer.playerId = player.id!;
        gameToPlayer.order = order;

        return gameToPlayer;
    });

    return game;
};

const createSubscription = (game: Game, player: Player, enabled: boolean): GameChatSubscription => {
    const subscription = new GameChatSubscription();

    subscription.gameId = game.id!;
    subscription.playerId = player.id!;
    subscription.player = player;
    subscription.enabled = enabled;

    return subscription;
};

/**
 * A service using a stubbed repository returning the given subscriptions.
 */
const createService = (subscriptions: GameChatSubscription[]): GameChatNotificationService => {
    const repository = {
        findByGameId: () => Promise.resolve(subscriptions),
    } as unknown as GameChatSubscriptionRepository;

    return new GameChatNotificationService(repository);
};

/**
 * A service recording the players it tried to subscribe.
 */
const createServiceRecordingSubscribes = (): { service: GameChatNotificationService, subscribed: Player[] } => {
    const subscribed: Player[] = [];

    const repository = {
        subscribeIfNoExplicitChoice: (_game: Game, player: Player) => {
            subscribed.push(player);

            return Promise.resolve();
        },
    } as unknown as GameChatSubscriptionRepository;

    return { service: new GameChatNotificationService(repository), subscribed };
};

const pseudos = (players: Player[]): string[] => players.map(player => player.pseudo).sort();

describe('GameChatNotificationService', () => {
    it('notifies both players of the game when there is no subscription', async () => {
        const player0 = createPlayer('player0');
        const player1 = createPlayer('player1');
        const game = createGameWithPlayers(player0, player1);

        const recipients = await createService([]).getChatNotificationRecipients(game);

        assert.deepStrictEqual(pseudos(recipients), ['player0', 'player1']);
    });

    it('does not notify a player of the game who explicitly unsubscribed', async () => {
        const player0 = createPlayer('player0');
        const player1 = createPlayer('player1');
        const game = createGameWithPlayers(player0, player1);

        const recipients = await createService([createSubscription(game, player1, false)])
            .getChatNotificationRecipients(game)
        ;

        assert.deepStrictEqual(pseudos(recipients), ['player0']);
    });

    it('notifies an observer who explicitly subscribed', async () => {
        const player0 = createPlayer('player0');
        const player1 = createPlayer('player1');
        const observer = createPlayer('observer');
        const game = createGameWithPlayers(player0, player1);

        const recipients = await createService([createSubscription(game, observer, true)])
            .getChatNotificationRecipients(game)
        ;

        assert.deepStrictEqual(pseudos(recipients), ['observer', 'player0', 'player1']);
    });

    it('does not notify an observer who explicitly unsubscribed', async () => {
        const player0 = createPlayer('player0');
        const player1 = createPlayer('player1');
        const observer = createPlayer('observer');
        const game = createGameWithPlayers(player0, player1);

        const recipients = await createService([createSubscription(game, observer, false)])
            .getChatNotificationRecipients(game)
        ;

        assert.deepStrictEqual(pseudos(recipients), ['player0', 'player1']);
    });

    it('subscribes an observer who posts a message', async () => {
        const player0 = createPlayer('player0');
        const player1 = createPlayer('player1');
        const observer = createPlayer('observer');
        const game = createGameWithPlayers(player0, player1);

        const { service, subscribed } = createServiceRecordingSubscribes();

        await service.autoSubscribeAuthor(game, observer);

        assert.deepStrictEqual(pseudos(subscribed), ['observer']);
    });

    it('does not create a row when a player of the game posts a message', async () => {
        const player0 = createPlayer('player0');
        const player1 = createPlayer('player1');
        const game = createGameWithPlayers(player0, player1);

        const { service, subscribed } = createServiceRecordingSubscribes();

        await service.autoSubscribeAuthor(game, player0);

        assert.deepStrictEqual(subscribed, []);
    });

    it('notifies players of a game not yet persisted', async () => {
        const player0 = createPlayer('player0');
        const player1 = createPlayer('player1');
        const game = createGameWithPlayers(player0, player1);

        game.id = undefined;

        const recipients = await createService([]).getChatNotificationRecipients(game);

        assert.deepStrictEqual(pseudos(recipients), ['player0', 'player1']);
    });
});
