import { Inject, Service } from 'typedi';
import HostedGame from '../HostedGame';
import { HostedGameState } from '../../shared/app/Types';
import { Player, ChatMessage, HostedGame as HostedGameEntity, HostedGameOptions, Move } from '../../shared/app/models';
import { canChatMessageBePostedInGame } from '../../shared/app/chatUtils';
import HostedGamePersister from '../persistance/HostedGamePersister';
import logger from '../services/logger';
import { validateOrReject } from 'class-validator';
import Rooms from '../../shared/app/Rooms';
import { HexServer } from '../server';
import { FindAIError, findAIOpponent } from '../services/AIManager';
import { Repository } from 'typeorm';
import { cloneGameOptions } from '../../shared/app/models/HostedGameOptions';
import { AppDataSource } from '../data-source';
import { plainToInstance } from '../../shared/app/class-transformer-custom';

export class GameError extends Error {}

const byRecentFirst = (game0: HostedGameEntity, game1: HostedGameEntity): number => {
    const date0 = game0.gameData?.endedAt ?? game0.createdAt;
    const date1 = game1.gameData?.endedAt ?? game1.createdAt;

    return date1.getTime() - date0.getTime();
};

@Service()
export default class HostedGameRepository
{
    /**
     * All currently created and playing games, from creation to game ended (then archived into database).
     * Contains a Game instance to play moves.
     *
     * Each playing game can contains a persisted copy,
     * but the most updated game should be in memory.
     */
    private activeGames: { [key: string]: HostedGame } = {};

    /**
     * Keep timeout thread id of hosted games to persist in N minutes
     * if no activity.
     * Prevent too much data loss in case server crashes.
     */
    private persistWhenNoActivity: { [key: string]: NodeJS.Timeout } = {};

    constructor(
        private hostedGamePersister: HostedGamePersister,
        private io: HexServer,

        @Inject('Repository<ChatMessage>')
        private chatMessageRepository: Repository<ChatMessage>,
    ) {
        this.loadActiveGamesFromMemory();
    }

    private async loadActiveGamesFromMemory(): Promise<void>
    {
        await AppDataSource.initialize();

        const games = await this.hostedGamePersister.findMany({
            where: [
                { state: 'created' },
                { state: 'playing' },
            ],
        });

        games.forEach(hostedGame => {
            if (this.activeGames[hostedGame.publicId]) {
                return;
            }

            this.activeGames[hostedGame.publicId] = HostedGame.fromData(hostedGame);

            this.enableAutoPersist(this.activeGames[hostedGame.publicId]);
        });
    }

    /**
     * Persist in-memory games.
     * Should be called before server manual restart.
     */
    async persistPlayingGames(): Promise<boolean>
    {
        logger.info('Persisting all playing games...');

        let allSuccess = true;

        for (const key in this.activeGames) {
            try {
                await this.hostedGamePersister.persist(this.activeGames[key].toData());
            } catch (e) {
                allSuccess = false;
                logger.error('Could not persist a game. Continue with others.', { gameId: key, e, errorMessage: e.message });
            }
        }

        logger.info('Persisting done.');

        return allSuccess;
    }

    /**
     * Auto persist game when needed.
     * Also flush it from memory.
     */
    private enableAutoPersist(hostedGame: HostedGame): void
    {
        // Persist on no activity
        const resetTimeout = (): void => {
            if (this.persistWhenNoActivity[hostedGame.getId()]) {
                clearTimeout(this.persistWhenNoActivity[hostedGame.getId()]);
                delete this.persistWhenNoActivity[hostedGame.getId()];
            }
        };

        // Persist on ended
        const onEnded = () => {
            resetTimeout();
            this.hostedGamePersister.persist(hostedGame.toData());
            delete this.activeGames[hostedGame.getId()];
        };

        if ('ended' === hostedGame.getState() || 'canceled' === hostedGame.getState()) {
            onEnded();
        } else {
            hostedGame.on('ended', onEnded);
            hostedGame.on('canceled', onEnded);
        }

        // Keep alive again when activity done on this game
        const onActivity = (): void => {
            resetTimeout();
            this.persistWhenNoActivity[hostedGame.getId()] = setTimeout(
                () => this.hostedGamePersister.persist(hostedGame.toData()),
                300 * 1000, // Persist after 5min inactivity
            );
        };

        hostedGame.on('played', onActivity);
        hostedGame.on('chat', onActivity);
    }

    getActiveGames(): { [key: string]: HostedGame }
    {
        return this.activeGames;
    }

    getActiveGame(gameId: string): null | HostedGame
    {
        return this.activeGames[gameId] ?? null;
    }

    getActiveGamesData(): HostedGameEntity[]
    {
        return Object.values(this.activeGames)
            .map(game => game.toData())
        ;
    }

    /**
     * Get finished games; bot games are ignored.
     * @param fromGamePublicId Take N ended games from fromGamePublicId, or from start if not set.
     */
    async getEndedGames(take = 10, fromGamePublicId?: string): Promise<HostedGameEntity[]>
    {
        return await this.hostedGamePersister.findLastEnded1v1(take, fromGamePublicId);
    }

    /**
     * Returns games to display initially on lobby.
     * Active games, plus some ended games.
     */
    async getLobbyGames(): Promise<HostedGameEntity[]>
    {
        const lobbyGames = this.getActiveGamesData();
        const endedGames = await this.getEndedGames(5);

        lobbyGames.push(...endedGames);

        return lobbyGames;
    }

    async getGame(publicId: string): Promise<HostedGameEntity | null>
    {
        if (this.activeGames[publicId]) {
            return this.activeGames[publicId].toData();
        }

        return await this.hostedGamePersister.findUnique(publicId);
    }

    async createGame(host: Player, gameOptions: HostedGameOptions): Promise<HostedGame>
    {
        const hostedGame = HostedGame.hostNewGame(gameOptions, host);

        if ('ai' === gameOptions.opponentType) {
            try {
                const opponent = await findAIOpponent(gameOptions);
                if (opponent == null) throw new GameError('No matching AI found');
                hostedGame.playerJoin(opponent);
            } catch (e) {
                if (e instanceof FindAIError) {
                    throw new GameError(e.message);
                }
                throw e;
            }
        }

        this.activeGames[hostedGame.getId()] = hostedGame;

        this.enableAutoPersist(hostedGame);

        return hostedGame;
    }

    async rematchGame(host: Player, gameId: string): Promise<HostedGame>
    {
        const game = await this.getGame(gameId);

        if (null === game) {
            throw new GameError(`no game ${gameId}`);
        }
        if (!game.hostedGameToPlayers.some(p => p.player.publicId === host.publicId)) {
            throw new GameError('Player not in the game');
        }
        if (game.rematch != null && this.activeGames[game.rematch.publicId]) {
            return this.activeGames[game.rematch.publicId];
        }
        if (game.rematch != null) {
            throw new GameError('An inactive rematch game already exists');
        }
        if (this.activeGames[gameId]) {
            throw new GameError('Cannot rematch an active game');
        }

        const rematch = await this.createGame(host, cloneGameOptions(game.gameOptions));
        this.io.to(Rooms.game(game.publicId))
            .emit('rematchAvailable', game.publicId, rematch.getId());

        game.rematch = rematch.toData();

        try {
            await this.hostedGamePersister.persist(game.rematch);
            await this.hostedGamePersister.persist(game);
        } catch (e) {
            logger.error(`Failed to persist: ${e?.message}`, e);
        }

        return rematch;
    }

    /**
     * @param fromGamePublicId Cursor, retrieve games after this one.
     */
    async getPlayerGames(
        player: Player,
        state: null | HostedGameState = null,
        fromGamePublicId: null | string = null,
    ): Promise<HostedGameEntity[]> {
        const hostedGameList: HostedGameEntity[] = [];

        for (const key in this.activeGames) {
            if (!this.activeGames[key].isPlayerInGame(player)) {
                continue;
            }

            if (null !== state && this.activeGames[key].getState() !== state) {
                continue;
            }

            hostedGameList.push(this.activeGames[key].toData());
        }

        const gamesFromDb = await this.hostedGamePersister.findLastEndedByPlayer(player, fromGamePublicId ?? undefined);

        hostedGameList.push(...gamesFromDb);
        hostedGameList.sort(byRecentFirst);

        return hostedGameList;
    }

    async playerJoinGame(player: Player, gameId: string): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        const joinResult = hostedGame.playerJoin(player);

        if ('string' === typeof joinResult) {
            return joinResult;
        }

        return true;
    }

    async playerMove(player: Player, gameId: string, move: Move): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        const result = hostedGame.playerMove(player, move);

        return result;
    }

    async playerResign(player: Player, gameId: string): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        const result = hostedGame.playerResign(player);

        return result;
    }

    async playerCancel(player: Player, gameId: string): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        const result = hostedGame.playerCancel(player);

        return result;
    }

    /**
     * @param publicId HostedGame public id to post message on.
     * @param chatMessage ChatMessage to post, with player, content and date.
     */
    async postChatMessage(publicId: string, chatMessage: ChatMessage): Promise<string | true>
    {
        try {
            await validateOrReject(plainToInstance(ChatMessage, chatMessage), {
                groups: ['post'],
            });
        } catch (e) {
            logger.error('Validation failed', { validationError: e });
            return e.message;
        }

        const hostedGame = this.activeGames[publicId];

        // Game is in memory, push chat message
        if (hostedGame) {
            let error: true | string;
            if (true !== (error = canChatMessageBePostedInGame(chatMessage, hostedGame.toData()))) {
                return error;
            }

            hostedGame.postChatMessage(chatMessage);
            return true;
        }

        // Game is not in memory, store chat message directly in database, on persisted game
        const hostedGameEntity = await this.hostedGamePersister.findUnique(publicId);

        if (null === hostedGameEntity) {
            logger.notice('Tried to chat on a non-existant game', { chatMessage });
            return `Game ${publicId} not found`;
        }

        let error: true | string;
        if (true !== (error = canChatMessageBePostedInGame(chatMessage, hostedGameEntity))) {
            return error;
        }

        chatMessage.hostedGame = hostedGameEntity;

        // Game is in database, insert chat message into database
        await this.chatMessageRepository.save(chatMessage);

        this.io.to(Rooms.game(publicId)).emit('chat', publicId, chatMessage);

        return true;
    }
}
