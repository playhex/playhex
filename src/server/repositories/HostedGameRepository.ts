import { Inject, Service } from 'typedi';
import HostedGameServer from '../HostedGameServer.js';
import { Player, ChatMessage, HostedGame, HostedGameOptions, Rating, Premove } from '../../shared/app/models/index.js';
import { canChatMessageBePostedInGame } from '../../shared/app/chatUtils.js';
import HostedGamePersister from '../persistance/HostedGamePersister.js';
import logger from '../services/logger.js';
import { FindAIError, findAIOpponent } from '../services/AIManager.js';
import { Repository } from 'typeorm';
import { cloneGameOptions } from '../../shared/app/models/HostedGameOptions.js';
import { AppDataSource } from '../data-source.js';
import RatingRepository from './RatingRepository.js';
import { isDuplicateError } from './typeormUtils.js';
import { whitelistedChatMessage } from '../../shared/app/whitelistedChatMessages.js';
import OnlinePlayersService from '../services/OnlinePlayersService.js';
import { createHostedGame, CreateHostedGameParams } from '../../shared/app/models/HostedGame.js';
import { AutoSave } from '../auto-save/AutoSave.js';
import { notifier } from '../services/notifications/notifier.js';
import { errorToLogger } from '../../shared/app/utils.js';
import type { HexMove } from '../../shared/move-notation/hex-move-notation.js';
import { isBotGame } from '../../shared/app/hostedGameUtils.js';
import { GameEventsEmitter } from '../services/game-events-emitter/GameEventsEmitter.js';

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

    private gamesLoadedPromise = Promise.withResolvers<true>();

    constructor(
        private hostedGamePersister: HostedGamePersister,
        private ratingRepository: RatingRepository,
        private onlinePlayerService: OnlinePlayersService,
        private gameEventEmitter: GameEventsEmitter,

        @Inject('Repository<ChatMessage>')
        private chatMessageRepository: Repository<ChatMessage>,

        @Inject('Repository<Player>')
        private playerRepository: Repository<Player>,
    ) {
        this.loadActiveGamesFromMemory().catch(e => {
            logger.error('Could not load active games', errorToLogger(e));
        });
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

        this.gamesLoadedPromise.resolve(true);
    }

    isReady(): Promise<true>
    {
        return this.gamesLoadedPromise.promise;
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
        if (hostedGameServer.getState() === 'ended') {
            this.onGameEnded(hostedGameServer).catch(e => {
                logger.error('onGameEnded returned an error in isStateEnded', errorToLogger(e));
            });

            return;
        }

        if (hostedGameServer.getState() === 'canceled') {
            this.onGameCanceled(hostedGameServer).catch(e => {
                logger.error('onGameCanceled returned an error in canceled precheck', errorToLogger(e));
            });

            return;
        }

        this.persistAfterDelayOfInactivity(hostedGameServer);

        hostedGameServer.on('ended', () => {
            this.onGameEnded(hostedGameServer).catch(e => {
                logger.error('onGameEnded returned an error in ended event', errorToLogger(e));
            });
        });

        hostedGameServer.on('canceled', () => {
            this.onGameCanceled(hostedGameServer).catch(e => {
                logger.error('onGameCanceled returned an error in cancelede event', errorToLogger(e));
            });
        });
    }

    /**
     * Activity made on a game, makes persist in new 5 minutes
     */
    private resetActivityTimeout(hostedGameServer: HostedGameServer): void
    {
        this.clearActivityTimeout(hostedGameServer);
        this.persistWhenNoActivity[hostedGameServer.getPublicId()] = setTimeout(
            () => void hostedGameServer.persist(),
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

        if (hostedGameServer.getHostedGame().ranked) {
            const newRatings = await this.updateRatings(hostedGameServer);

            this.gameEventEmitter.emitRatingsUpdated(hostedGameServer.getHostedGame(), newRatings);
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

    getActive1v1GamesData(): HostedGame[]
    {
        return Object.values(this.activeGames)
            .filter(game => !isBotGame(game.getHostedGame()))
            .map(game => game.getHostedGame())
        ;
    }

    getWaiting1v1GamesData(): HostedGame[]
    {
        return Object.values(this.activeGames)
            .filter(game => game.getHostedGame().state === 'created' && !isBotGame(game.getHostedGame()))
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

    async makeAIJoinGameIfApplicable(hostedGameServer: HostedGameServer, params: CreateHostedGameParams & { gameOptions: HostedGameOptions })
    {
        if (params.gameOptions.opponentType !== 'ai') {
            return;
        }

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

    /**
     * Officially creates a new hosted game, emit event to clients.
     */
    async createGame(
        params: CreateHostedGameParams & { gameOptions: HostedGameOptions },
        createOptions: {
            /**
             * Defaults to true: game are persisted before returned.
             * Set false when it's safe: no risk of game fail to persist, and make it faster (no db call).
             * May be true when there is a risk of unique constrait, like in the rematch workflow:
             * we need to persist rematched and rematch at same time in a transaction.
             */
            persist?: boolean;

            /**
             * Defaults to true: AI join as opponent if this is a bot game.
             * May be disabled to prevent race condition:
             * when AI join, game starts, and persist: we may want to wait before persist.
             */
            aiJoinAuto?: boolean;
        } = { persist: true, aiJoinAuto: true },
    ): Promise<HostedGameServer> {
        if (params.host) {
            this.onlinePlayerService.notifyPlayerActivity(params.host);
        }

        const hostedGame = createHostedGame(params);
        const hostedGameServer = this.createHostedGameServerForHostedGame(hostedGame);

        hostedGameServer.saveState();

        logger.info('Hosted game created.', { host: params.host?.pseudo ?? null, publicId: hostedGame.publicId });

        this.gameEventEmitter.emitGameCreated(hostedGame);

        if (createOptions.aiJoinAuto ?? true) {
            await this.makeAIJoinGameIfApplicable(hostedGameServer, params);
        }

        this.activeGames[hostedGameServer.getPublicId()] = hostedGameServer;

        this.listenHostedGameServer(hostedGameServer);

        if (!(createOptions.persist ?? true)) {
            return hostedGameServer;
        }

        try {
            await hostedGameServer.persist();
        } catch (e) {
            logger.error('Could not persist game after creation', {
                hostedGamePublicId: hostedGameServer.getPublicId(),
                message: e.message,
                stack: e.stack,
            });

            throw e;
        }

        return hostedGameServer;
    }

    async rematchGame(host: Player, publicId: string): Promise<HostedGame>
    {
        logger.info('rematch game', { hostPublicId: host.publicId, publicId });

        const game = await this.getActiveOrArchivedGame(publicId);

        if (game === null) {
            throw new GameError(`no game ${publicId}`);
        }
        if (!game.hostedGameToPlayers.some(p => p.player.publicId === host.publicId)) {
            throw new GameError('Player not in the game');
        }
        if (game.rematch != null && this.activeGames[game.rematch.publicId]) {
            logger.info('rematch game: already has rematch, return', { publicId, rematchPublicId: game.rematch.publicId });
            return this.activeGames[game.rematch.publicId].getHostedGame();
        }
        if (game.rematch != null) {
            throw new GameError('An inactive rematch game already exists');
        }
        if (this.activeGames[publicId]) {
            throw new GameError('Cannot rematch an active game');
        }

        const params = { gameOptions: cloneGameOptions(game), host, rematchedFrom: game };

        const rematch = await this.createGame(params, { persist: false, aiJoinAuto: false }); // do not persist because will persist later in the transaction, at same time as rematchId
        game.rematch = rematch.getHostedGame();

        try {
            logger.info('persist rematch game, and rematched game', {
                game: game.publicId,
                rematch: game.rematch.publicId,
                rematchRematchedFrom: game.rematch.rematchedFrom?.publicId,
            });

            await this.hostedGamePersister.persistMultiple([game, game.rematch]);

            await this.makeAIJoinGameIfApplicable(rematch, params);
        } catch (e) {
            if (isDuplicateError(e)) {
                logger.info('Rematch duplicate, fix', {
                    game: game.publicId,
                    rematch: game.rematch.publicId,
                    errorMessage: e.message,
                });

                // In case both players rematch at same time, 2 games are created in memory but with same rematchedFromId, so one game won't persist thanks to unicity constraint.
                // So here we try to fetch the actual rematch, returns it, and remove the duplicated rematch from memory.
                if (game.rematch) {
                    delete this.activeGames[game.rematch.publicId];
                }

                if (!game.id) {
                    throw new Error('Unexpected empty game.id');
                }

                game.rematch = await this.hostedGamePersister.findRematch(game.id);

                logger.info('First rematch found:', {
                    game: game.publicId,
                    rematch: game.rematch?.publicId,
                });

                if (game.rematch === null) {
                    throw new Error('Game has already rematched, but could not find rematch game');
                }
            } else {
                logger.error(`Failed to persist: ${e?.message}`, e);

                // Throw to prevent returning a rematch game that failed to persist
                throw e;
            }
        }

        this.gameEventEmitter.emitRematchAvailable(game, game.rematch.publicId);

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

    playerJoinGame(player: Player, gameId: string): string | true
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const joinResult = hostedGame.playerJoin(player);

        if (typeof joinResult === 'string') {
            return joinResult;
        }

        return true;
    }

    playerMove(player: Player, gameId: string, move: HexMove): string | true
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = hostedGame.playerMove(player, move);

        return result;
    }

    playerPremove(player: Player, gameId: string, premove: Premove): string | true
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = hostedGame.playerPremove(player, premove);

        return result;
    }

    playerCancelPremove(player: Player, gameId: string): string | true
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = hostedGame.playerCancelPremove(player);

        return result;
    }

    playerAskUndo(player: Player, gameId: string): string | true
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = hostedGame.playerAskUndo(player);

        return result;
    }

    playerAnswerUndo(player: Player, gameId: string, accept: boolean): string | true
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = hostedGame.playerAnswerUndo(player, accept);

        return result;
    }

    playerResign(player: Player, gameId: string): string | true
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = hostedGame.playerResign(player);

        return result;
    }

    playerCancel(player: Player, gameId: string): string | true
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
        if (chatMessage.player !== null) {
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
            if ((error = canChatMessageBePostedInGame(chatMessage, hostedGameServer.getHostedGame())) !== true) {
                return error;
            }

            hostedGameServer.postChatMessage(chatMessage);
            return true;
        }

        // Game is not in memory, store chat message directly in database, on persisted game
        const hostedGame = await this.hostedGamePersister.findUnique(publicId);

        if (hostedGame === null) {
            logger.notice('Tried to chat on a non-existant game', { chatMessage });
            return `Game ${publicId} not found`;
        }

        let error: true | string;
        if ((error = canChatMessageBePostedInGame(chatMessage, hostedGame)) !== true) {
            return error;
        }

        chatMessage.hostedGame = hostedGame;

        // Game is in database, insert chat message into database
        await this.chatMessageRepository.save(chatMessage);

        notifier.emit('chatMessage', hostedGame, chatMessage);

        this.gameEventEmitter.emitChat(hostedGame, chatMessage);

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
