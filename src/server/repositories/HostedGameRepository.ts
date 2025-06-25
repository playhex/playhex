import { Container, Inject, Service } from 'typedi';
import HostedGameServer from '../HostedGameServer.js';
import { Player, ChatMessage, HostedGame, HostedGameOptions, Move, Rating } from '../../shared/app/models/index.js';
import { canChatMessageBePostedInGame } from '../../shared/app/chatUtils.js';
import HostedGamePersister from '../persistance/HostedGamePersister.js';
import logger from '../services/logger.js';
import { validateOrReject } from 'class-validator';
import Rooms from '../../shared/app/Rooms.js';
import { HexServer } from '../server.js';
import { FindAIError, findAIOpponent } from '../services/AIManager.js';
import { Repository } from 'typeorm';
import { cloneGameOptions } from '../../shared/app/models/HostedGameOptions.js';
import { AppDataSource } from '../data-source.js';
import { instanceToInstance, plainToInstance } from '../../shared/app/class-transformer-custom.js';
import RatingRepository from './RatingRepository.js';
import AutoCancelStaleGames from '../services/background-tasks/AutoCancelStaleGames.js';
import AutoCancelStaleCorrespondenceGames from '../services/background-tasks/AutoCancelStaleCorrespondenceGames.js';
import { isDuplicateError } from './typeormUtils.js';
import { whitelistedChatMessage } from '../../shared/app/whitelistedChatMessages.js';
import OnlinePlayersService from '../services/OnlinePlayersService.js';
import { createHostedGame, CreateHostedGameParams } from '../../shared/app/models/HostedGame.js';
import { AutoSave } from '../auto-save/AutoSave.js';
import { isStateEnded } from '../../shared/app/hostedGameUtils.js';

export class GameError extends Error {}

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
    private activeGames: { [publicId: string]: HostedGameServer } = {};

    /**
     * Keep timeout thread id of hosted games to persist in N minutes
     * if no activity.
     * Prevent too much data loss in case server crashes.
     */
    private persistWhenNoActivity: { [publicId: string]: ReturnType<typeof setTimeout> } = {};

    constructor(
        private hostedGamePersister: HostedGamePersister,
        private ratingRepository: RatingRepository,
        private autoCancelStaleGames: AutoCancelStaleGames,
        private autoCancelStaleCorrespondenceGames: AutoCancelStaleCorrespondenceGames,
        private onlinePlayerService: OnlinePlayersService,

        @Inject('Repository<ChatMessage>')
        private chatMessageRepository: Repository<ChatMessage>,

        @Inject('Repository<Player>')
        private playerRepository: Repository<Player>,
    ) {
        this.loadActiveGamesFromMemory();
    }

    private async loadActiveGamesFromMemory(): Promise<void>
    {
        logger.info('Loading active games from memory...');

        await AppDataSource.initialize();

        const games = await this.hostedGamePersister.findMany({
            where: [
                { state: 'created' },
                { state: 'playing' },
            ],
        });

        for (const hostedGame of games) {
            logger.info(`Loading game ${hostedGame.publicId}...`);

            if (this.activeGames[hostedGame.publicId]) {
                return;
            }

            // Check whether data.createdAt is an instance of Date and not a string,
            // to check whether denormalization with superjson worked.
            if (!(hostedGame.createdAt instanceof Date)) {
                logger.error(
                    'HostedGame.fromData(): Error while trying to recreate a HostedGame from data,'
                    + ' createdAt is not an instance of Date.',
                );
            }

            this.activeGames[hostedGame.publicId] = this.createHostedGameServerForHostedGame(hostedGame);

            this.listenHostedGameServer(this.activeGames[hostedGame.publicId]);
        }

        logger.info(`${games.length} games loaded.`);

        this.autoCancelStaleGames.start(player => this.getPlayerActiveGames(player), Object.values(this.activeGames));
        this.autoCancelStaleCorrespondenceGames.start(() => Object.values(this.activeGames));
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
                await this.activeGames[key].persist();
            } catch (e) {
                allSuccess = false;
                logger.error('Could not persist a game. Continue with others.', { gameId: key, e, errorMessage: e.message });
            }
        }

        logger.info('All playing games persisting done.');

        return allSuccess;
    }

    private listenHostedGameServer(hostedGameServer: HostedGameServer): void
    {
        if (isStateEnded(hostedGameServer.getHostedGame())) {
            this.onGameEnded(hostedGameServer);
            return;
        }

        if ('canceled' === hostedGameServer.getState()) {
            this.onGameCanceled(hostedGameServer);
            return;
        }

        this.persistAfterDelayOfInactivity(hostedGameServer);

        hostedGameServer.on('ended', () => this.onGameEnded(hostedGameServer));
        hostedGameServer.on('canceled', () => this.onGameCanceled(hostedGameServer));
    }

    /**
     * Activity made on a game, makes persist in new 5 minutes
     */
    private resetActivityTimeout(hostedGameServer: HostedGameServer): void
    {
        this.clearActivityTimeout(hostedGameServer);
        this.persistWhenNoActivity[hostedGameServer.getPublicId()] = setTimeout(
            () => hostedGameServer.persist(),
            300 * 1000, // Persist after 5min inactivity
        );
    }

    /**
     * Cancel planned persist
     */
    private clearActivityTimeout(hostedGameServer: HostedGameServer): void
    {
        if (this.persistWhenNoActivity[hostedGameServer.getPublicId()]) {
            clearTimeout(this.persistWhenNoActivity[hostedGameServer.getPublicId()]);
            delete this.persistWhenNoActivity[hostedGameServer.getPublicId()];
        }
    }

    /**
     * Persist game when no activity in case server restart
     */
    private persistAfterDelayOfInactivity(hostedGameServer: HostedGameServer): void
    {
        hostedGameServer.on('played', () => this.resetActivityTimeout(hostedGameServer));
        hostedGameServer.on('chat', () => this.resetActivityTimeout(hostedGameServer));
    }

    /**
     * Flush game from memory, persist into database
     */
    private async flushHostedGame(hostedGameServer: HostedGameServer): Promise<void>
    {
        this.clearActivityTimeout(hostedGameServer);
        await hostedGameServer.persist();
        delete this.activeGames[hostedGameServer.getPublicId()];
    }

    /**
     * Things to do when game has ended
     */
    private async onGameEnded(hostedGameServer: HostedGameServer): Promise<void>
    {
        await this.flushHostedGame(hostedGameServer);

        if (hostedGameServer.getHostedGame().gameOptions.ranked) {
            const newRatings = await this.updateRatings(hostedGameServer);

            Container.get(HexServer)
                .to([
                    Rooms.game(hostedGameServer.getPublicId()),
                    Rooms.lobby,
                ])
                .emit(
                    'ratingsUpdated',
                    hostedGameServer.getPublicId(),
                    instanceToInstance(newRatings.filter(rating => 'overall' === rating.category), {
                        groups: ['rating'],
                    }),
                )
            ;
        }
    }

    /**
     * Things to do when game has canceled
     */
    private async onGameCanceled(hostedGameServer: HostedGameServer): Promise<void>
    {
        await this.flushHostedGame(hostedGameServer);
    }

    /**
     * Update players ratings
     */
    private async updateRatings(hostedGameServer: HostedGameServer): Promise<Rating[]>
    {
        try {
            const newRatings = await this.ratingRepository.updateAfterGame(hostedGameServer.getHostedGame());

            await this.ratingRepository.persistRatings(newRatings);
            await this.playerRepository.save(hostedGameServer.getPlayers());

            return newRatings;
        } catch (e) {
            logger.error('Error while persist ratings for game', {
                hostedGamePublicId: hostedGameServer.getPublicId(),
                players: hostedGameServer.getPlayers().map(player => player.pseudo),
                reason: e.message,
            });

            throw new Error('Error while persist ratings for game ' + hostedGameServer.getPublicId());
        }
    }

    getActiveGames(): { [key: string]: HostedGameServer }
    {
        return this.activeGames;
    }

    getActiveGame(gameId: string): null | HostedGameServer
    {
        return this.activeGames[gameId] ?? null;
    }

    getActiveGamesData(): HostedGame[]
    {
        return Object.values(this.activeGames)
            .map(game => game.getHostedGame())
        ;
    }

    async getActiveOrArchivedGame(publicId: string): Promise<HostedGame | null>
    {
        if (this.activeGames[publicId]) {
            return this.activeGames[publicId].getHostedGame();
        }

        return await this.hostedGamePersister.findUnique(publicId);
    }

    private createHostedGameServerForHostedGame(hostedGame: HostedGame): HostedGameServer
    {
        return new HostedGameServer(
            hostedGame,
            new AutoSave<HostedGame>(() => this.hostedGamePersister.persist(hostedGame)),
        );
    }

    /**
     * Officially creates a new hosted game, emit event to clients.
     */
    async createGame(params: CreateHostedGameParams & { gameOptions: HostedGameOptions }): Promise<HostedGameServer>
    {
        if (undefined !== params.gameOptions.hostedGameId && params.gameOptions.hostedGameId === params.gameOptions.hostedGame.id) {
            logger.warning('Provided gameOptions instance seem to be already linked to another hostedGame');
        }

        if (params.host) {
            this.onlinePlayerService.notifyPlayerActivity(params.host);
        }

        const hostedGame = createHostedGame(params);
        const hostedGameServer = this.createHostedGameServerForHostedGame(hostedGame);

        hostedGameServer.saveState();

        logger.info('Hosted game created.', { host: params.host?.pseudo ?? null });

        Container.get(HexServer).to(Rooms.lobby).emit('gameCreated', hostedGame);

        if ('ai' === params.gameOptions.opponentType) {
            try {
                const opponent = await findAIOpponent(params.gameOptions);
                if (opponent == null) throw new GameError('No matching AI found');
                hostedGameServer.playerJoin(opponent);
            } catch (e) {
                if (e instanceof FindAIError) {
                    throw new GameError(e.message);
                }
                throw e;
            }
        }

        this.activeGames[hostedGameServer.getPublicId()] = hostedGameServer;

        this.listenHostedGameServer(hostedGameServer);

        try {
            await hostedGameServer.persist();
        } catch (e) {
            logger.error('Could not persist game after creation', {
                hostedGamePublicId: hostedGameServer.getPublicId(),
                e,
            });
        }

        return hostedGameServer;
    }

    async rematchGame(host: Player, gameId: string): Promise<HostedGame>
    {
        const game = await this.getActiveOrArchivedGame(gameId);

        if (null === game) {
            throw new GameError(`no game ${gameId}`);
        }
        if (!game.hostedGameToPlayers.some(p => p.player.publicId === host.publicId)) {
            throw new GameError('Player not in the game');
        }
        if (game.rematch != null && this.activeGames[game.rematch.publicId]) {
            return this.activeGames[game.rematch.publicId].getHostedGame();
        }
        if (game.rematch != null) {
            throw new GameError('An inactive rematch game already exists');
        }
        if (this.activeGames[gameId]) {
            throw new GameError('Cannot rematch an active game');
        }

        const rematch = await this.createGame({ gameOptions: cloneGameOptions(game.gameOptions), host, rematchedFrom: game });
        game.rematch = rematch.getHostedGame();

        try {
            await this.hostedGamePersister.persist(game);
        } catch (e) {
            if (isDuplicateError(e)) {
                // In case both players rematch at same time, 2 games are created in memory but with same rematchedFromId, so one game won't persist thanks to unicity constraint.
                // So here we try to fetch the actual rematch, returns it, and remove the duplicated rematch from memory.
                delete this.activeGames[game.rematch.publicId];

                if (!game.id) {
                    throw new Error('Unexpected empty game.id');
                }

                game.rematch = await this.hostedGamePersister.findRematch(game.id);

                if (null === game.rematch) {
                    throw new Error('Game has already rematched, but could not find rematch game');
                }
            } else {
                logger.error(`Failed to persist: ${e?.message}`, e);

                // Throw to prevent returning a rematch game that failed to persist
                throw new Error('Error while persisting rematch game');
            }
        }

        Container.get(HexServer).to(Rooms.game(game.publicId))
            .emit('rematchAvailable', game.publicId, game.rematch.publicId);

        return game.rematch;
    }

    getPlayerActiveGames(player: Player): HostedGameServer[]
    {
        const hostedGameServers: HostedGameServer[] = [];

        for (const key in this.activeGames) {
            if (!this.activeGames[key].isPlayerInGame(player)) {
                continue;
            }

            hostedGameServers.push(this.activeGames[key]);
        }

        return hostedGameServers;
    }

    async playerJoinGame(player: Player, gameId: string): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

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
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = hostedGame.playerMove(player, move);

        return result;
    }

    async playerPremove(player: Player, gameId: string, move: Move): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = hostedGame.playerPremove(player, move);

        return result;
    }

    async playerCancelPremove(player: Player, gameId: string): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = hostedGame.playerCancelPremove(player);

        return result;
    }

    async playerAskUndo(player: Player, gameId: string): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = hostedGame.playerAskUndo(player);

        return result;
    }

    async playerAnswerUndo(player: Player, gameId: string, accept: boolean): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = hostedGame.playerAnswerUndo(player, accept);

        return result;
    }

    async playerResign(player: Player, gameId: string): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = hostedGame.playerResign(player);

        return result;
    }

    async playerCancel(player: Player, gameId: string): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

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

        if (null !== chatMessage.player) {
            this.onlinePlayerService.notifyPlayerActivity(chatMessage.player);
        }

        // shadow delete chat message if player is shadow banned for chat messages
        if (chatMessage.player?.shadowBanned && !whitelistedChatMessage[chatMessage.content]) {
            chatMessage.shadowDeleted = true;
        }

        const hostedGameServer = this.activeGames[publicId];

        // Game is in memory, push chat message
        if (hostedGameServer) {
            let error: true | string;
            if (true !== (error = canChatMessageBePostedInGame(chatMessage, hostedGameServer.getHostedGame()))) {
                return error;
            }

            hostedGameServer.postChatMessage(chatMessage);
            return true;
        }

        // Game is not in memory, store chat message directly in database, on persisted game
        const hostedGame = await this.hostedGamePersister.findUnique(publicId);

        if (null === hostedGame) {
            logger.notice('Tried to chat on a non-existant game', { chatMessage });
            return `Game ${publicId} not found`;
        }

        let error: true | string;
        if (true !== (error = canChatMessageBePostedInGame(chatMessage, hostedGame))) {
            return error;
        }

        chatMessage.hostedGame = hostedGame;

        // Game is in database, insert chat message into database
        await this.chatMessageRepository.save(chatMessage);

        Container.get(HexServer).to(Rooms.game(publicId)).emit('chat', publicId, chatMessage);

        return true;
    }

    /**
     * Shadow delete player chat messages in active games
     */
    shadowDeletePlayerChatMessages(playerPublicId: string): number
    {
        let shadowDeleted = 0;

        for (const key in this.activeGames) {
            const activeGame = this.activeGames[key];

            for (const chatMessage of activeGame.getHostedGame().chatMessages) {
                if (chatMessage.player?.publicId === playerPublicId
                    && !whitelistedChatMessage[chatMessage.content]
                    && !chatMessage.shadowDeleted
                ) {
                    chatMessage.shadowDeleted = true;
                    ++shadowDeleted;
                }
            }
        }

        return shadowDeleted;
    }
}
