import { Inject, Service } from 'typedi';
import GameServer from '../GameServer.js';
import { Player, ChatMessage, Game, GameOptions, Rating, Premove } from '../../shared/app/models/index.js';
import { canChatMessageBePostedInGame } from '../../shared/app/chatUtils.js';
import GameRepository from '../repositories/GameRepository.js';
import logger from '../services/logger.js';
import { FindAIError, findAIOpponent } from '../services/AIManager.js';
import { Repository } from 'typeorm';
import { cloneGameOptions } from '../../shared/app/models/GameOptions.js';
import { AppDataSource } from '../data-source.js';
import RatingRepository from '../repositories/RatingRepository.js';
import { isDuplicateError } from '../repositories/typeormUtils.js';
import { whitelistedChatMessage } from '../../shared/app/whitelistedChatMessages.js';
import OnlinePlayersService from '../services/OnlinePlayersService.js';
import { createGame, CreateGameParams } from '../../shared/app/models/Game.js';
import { AutoSave } from '../auto-save/AutoSave.js';
import { notifier } from '../services/notifications/notifier.js';
import { errorToLogger } from '../../shared/app/utils.js';
import type { HexMove } from '../../shared/move-notation/hex-move-notation.js';
import { getOtherPlayer, isBotGame, isChallengeGame, isChallengeTargetOf } from '../../shared/app/gameUtils.js';
import { GameEventsEmitter } from '../services/game-events-emitter/GameEventsEmitter.js';
import PlayerModerationActionRepository from '../repositories/PlayerModerationActionRepository.js';
import { rateLimiterConsumeChatMessage } from '../services/rate-limiters.js';
import PlayerIdentityMap from '../identity-map/PlayerIdentityMap.js';

export class GameError extends Error {}
export class CannotChallengeYourselfError extends GameError {}
export class AlreadyHaveOpenChallengeAgainstThisPlayerError extends GameError {}

@Service()
export default class GameStore
{
    /**
     * All currently created and playing games, from creation to game ended (then archived into database).
     * Contains a Game instance to play moves.
     *
     * Each playing game can contains a persisted copy,
     * but the most updated game should be in memory.
     */
    private activeGames: { [publicId: string]: GameServer } = {};

    /**
     * Keep timeout thread id of games to persist in N minutes
     * if no activity.
     * Prevent too much data loss in case server crashes.
     */
    private persistWhenNoActivity: { [publicId: string]: ReturnType<typeof setTimeout> } = {};

    private gamesLoadedPromise = Promise.withResolvers<true>();

    constructor(
        private gameRepository: GameRepository,
        private ratingRepository: RatingRepository,
        private onlinePlayerService: OnlinePlayersService,
        private gameEventEmitter: GameEventsEmitter,
        private playerModerationActionRepository: PlayerModerationActionRepository,

        private playerIdentityMap: PlayerIdentityMap,

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

        const games = await this.gameRepository.findMany({
            where: [
                { state: 'created' },
                { state: 'playing' },
            ],
        });

        for (const game of games) {
            logger.info(`Loading game ${game.publicId}...`);

            if (this.activeGames[game.publicId]) {
                return;
            }

            // Check whether data.createdAt is an instance of Date and not a string,
            // to check whether denormalization with superjson worked.
            if (!(game.createdAt instanceof Date)) {
                logger.error(
                    'Game.fromData(): Error while trying to recreate a Game from data,'
                    + ' createdAt is not an instance of Date.',
                );
            }

            this.activeGames[game.publicId] = this.createGameServer(game);

            this.listenGameServer(this.activeGames[game.publicId]);
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

    private listenGameServer(gameServer: GameServer): void
    {
        if (gameServer.getState() === 'ended') {
            this.onGameEnded(gameServer).catch(e => {
                logger.error('onGameEnded returned an error in isStateEnded', errorToLogger(e));
            });

            return;
        }

        if (gameServer.getState() === 'canceled') {
            this.onGameCanceled(gameServer).catch(e => {
                logger.error('onGameCanceled returned an error in canceled precheck', errorToLogger(e));
            });

            return;
        }

        this.persistAfterDelayOfInactivity(gameServer);

        gameServer.on('ended', () => {
            this.onGameEnded(gameServer).catch(e => {
                logger.error('onGameEnded returned an error in ended event', errorToLogger(e));
            });
        });

        gameServer.on('canceled', () => {
            this.onGameCanceled(gameServer).catch(e => {
                logger.error('onGameCanceled returned an error in cancelede event', errorToLogger(e));
            });
        });
    }

    /**
     * Activity made on a game, makes persist in new 5 minutes
     */
    private resetActivityTimeout(gameServer: GameServer): void
    {
        this.clearActivityTimeout(gameServer);
        this.persistWhenNoActivity[gameServer.getPublicId()] = setTimeout(
            () => void gameServer.persist(),
            300 * 1000, // Persist after 5min inactivity
        );
    }

    /**
     * Cancel planned persist
     */
    private clearActivityTimeout(gameServer: GameServer): void
    {
        if (this.persistWhenNoActivity[gameServer.getPublicId()]) {
            clearTimeout(this.persistWhenNoActivity[gameServer.getPublicId()]);
            delete this.persistWhenNoActivity[gameServer.getPublicId()];
        }
    }

    /**
     * Persist game when no activity in case server restart
     */
    private persistAfterDelayOfInactivity(gameServer: GameServer): void
    {
        gameServer.on('played', () => this.resetActivityTimeout(gameServer));
        gameServer.on('chat', () => this.resetActivityTimeout(gameServer));
    }

    /**
     * Flush game from memory, persist into database
     */
    private async flushGame(gameServer: GameServer): Promise<void>
    {
        this.clearActivityTimeout(gameServer);
        await gameServer.persist();
        delete this.activeGames[gameServer.getPublicId()];
    }

    /**
     * Things to do when game has ended
     */
    private async onGameEnded(gameServer: GameServer): Promise<void>
    {
        await this.flushGame(gameServer);

        if (gameServer.getGame().ranked) {
            const newRatings = await this.updateRatings(gameServer);

            this.gameEventEmitter.emitRatingsUpdated(gameServer.getGame(), newRatings);
        }
    }

    /**
     * Things to do when game has canceled
     */
    private async onGameCanceled(gameServer: GameServer): Promise<void>
    {
        await this.flushGame(gameServer);
    }

    /**
     * Update players ratings
     */
    private async updateRatings(gameServer: GameServer): Promise<Rating[]>
    {
        try {
            const newRatings = await this.ratingRepository.updateAfterGame(gameServer.getGame());

            await this.ratingRepository.persistRatings(newRatings);
            await this.playerRepository.save(gameServer.getPlayers());

            return newRatings;
        } catch (e) {
            logger.error('Error while persist ratings for game', {
                gamePublicId: gameServer.getPublicId(),
                players: gameServer.getPlayers().map(player => player.pseudo),
                reason: e.message,
            });

            throw new Error('Error while persist ratings for game ' + gameServer.getPublicId());
        }
    }

    getActiveGames(): { [key: string]: GameServer }
    {
        return this.activeGames;
    }

    getActiveGame(gameId: string): null | GameServer
    {
        return this.activeGames[gameId] ?? null;
    }

    getActiveGamesData(): Game[]
    {
        return Object.values(this.activeGames)
            .map(gameServer => gameServer.getGame())
        ;
    }

    getActive1v1GamesData(): Game[]
    {
        return Object.values(this.activeGames)
            .filter(gameServer => !isBotGame(gameServer.getGame()))
            .map(gameServer => gameServer.getGame())
        ;
    }

    getWaiting1v1GamesData(): Game[]
    {
        return Object.values(this.activeGames)
            .filter(gameServer => gameServer.getGame().state === 'created' && !isBotGame(gameServer.getGame()) && !isChallengeGame(gameServer.getGame()))
            .map(gameServer => gameServer.getGame())
        ;
    }

    getUnpersistedChatMessagesForModeration(): ChatMessage[]
    {
        const chatMessages: ChatMessage[] = [];

        for (const key in this.activeGames) {
            const game = this.activeGames[key].getGame();

            for (const chatMessage of game.chatMessages) {
                // Already persisted
                if (chatMessage.id) {
                    continue;
                }

                // Special message (took back their move, ai analysis available, ...)
                if (chatMessage.contentTranslationKey) {
                    continue;
                }

                // Already deleted by moderation
                if (chatMessage.deletedByModeration) {
                    continue;
                }

                chatMessages.push({ ...chatMessage, game });
            }
        }

        return chatMessages;
    }

    async getActiveOrArchivedGame(publicId: string): Promise<Game | null>
    {
        if (this.activeGames[publicId]) {
            return this.activeGames[publicId].getGame();
        }

        return await this.gameRepository.findUnique(publicId);
    }

    private createGameServer(game: Game): GameServer
    {
        if (game.host !== null) {
            game.host = this.playerIdentityMap.resolve(game.host);
        }

        for (const gameToPlayer of game.gameToPlayers) {
            gameToPlayer.player = this.playerIdentityMap.resolve(gameToPlayer.player);
        }

        return new GameServer(
            game,
            new AutoSave<Game>(() => this.gameRepository.persist(game)),
        );
    }

    async makeAIJoinGameIfApplicable(gameServer: GameServer, params: CreateGameParams & { gameOptions: GameOptions })
    {
        if (params.gameOptions.opponentType !== 'ai') {
            return;
        }

        try {
            const opponent = await findAIOpponent(params.gameOptions);
            if (opponent == null) throw new GameError('No matching AI found');
            gameServer.playerJoin(opponent);
        } catch (e) {
            if (e instanceof FindAIError) {
                throw new GameError(e.message);
            }
            throw e;
        }
    }

    /**
     * Tracks host+target pairs that have passed resolveChallengeTarget but are not yet
     * registered in this.activeGames, to close the race window opened by the await below
     * (two concurrent challenges from the same host to the same target would otherwise
     * both read activeGames before either is inserted into it).
     */
    private readonly pendingChallengeKeys = new Set<string>();

    private challengeKey(hostPublicId: string, opponentPublicId: string): string
    {
        return `${hostPublicId}:${opponentPublicId}`;
    }

    /**
     * When creating a nominative challenge (opponentType player + opponentPublicId set),
     * resolves and validates the challenged player: must exist, cannot be the host himself,
     * and host cannot already have a pending (not yet joined) challenge against the same player.
     */
    private async resolveChallengeTarget(host: null | Player, opponentPublicId: string): Promise<Player>
    {
        if (host && host.publicId === opponentPublicId) {
            throw new CannotChallengeYourselfError();
        }

        const opponent = await this.playerRepository.findOne({ where: { publicId: opponentPublicId } });

        if (opponent === null) {
            throw new GameError('Challenged player not found.');
        }

        if (opponent.isBot) {
            throw new GameError('Cannot challenge a bot.');
        }

        if (host !== null) {
            const key = this.challengeKey(host.publicId, opponentPublicId);

            const alreadyChallenged = this.pendingChallengeKeys.has(key) || Object.values(this.activeGames).some(gameServer => {
                const g = gameServer.getGame();

                return g.state === 'created'
                    && g.opponentType === 'player'
                    && g.opponentPublicId === opponentPublicId
                    && g.host !== null
                    && g.host.publicId === host.publicId
                ;
            });

            if (alreadyChallenged) {
                throw new AlreadyHaveOpenChallengeAgainstThisPlayerError();
            }

            // Reserved synchronously: no await happens between here and the game being
            // added to this.activeGames, so a concurrent call cannot slip past this check.
            this.pendingChallengeKeys.add(key);
        }

        return opponent;
    }

    /**
     * Officially creates a new game, emit event to clients.
     */
    async createGame(
        params: CreateGameParams & { gameOptions: GameOptions },
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
    ): Promise<GameServer> {
        if (params.host) {
            this.onlinePlayerService.notifyPlayerActivity(params.host);
        }

        let challengedOpponent: null | Player = null;
        const challengeKey = params.host && isChallengeGame(params.gameOptions)
            ? this.challengeKey(params.host.publicId, params.gameOptions.opponentPublicId)
            : null;

        if (isChallengeGame(params.gameOptions)) {
            try {
                challengedOpponent = await this.resolveChallengeTarget(params.host ?? null, params.gameOptions.opponentPublicId);
            } catch (e) {
                if (challengeKey !== null) {
                    this.pendingChallengeKeys.delete(challengeKey);
                }

                throw e;
            }
        }

        try {
            const game = createGame(params);
            const gameServer = this.createGameServer(game);

            gameServer.saveState();

            logger.info('Game created.', { host: params.host?.pseudo ?? null, publicId: game.publicId });

            this.gameEventEmitter.emitGameCreated(game);

            // Rematching a challenge already notifies the opponent through the rematch offer,
            // no need to also notify them as if it were a new, unrelated challenge.
            const isRematch = params.rematchedFrom != null;

            if (challengedOpponent !== null && !isRematch) {
                this.gameEventEmitter.emitGameChallengeCreated(game);
            }

            if (createOptions.aiJoinAuto ?? true) {
                await this.makeAIJoinGameIfApplicable(gameServer, params);
            }

            this.activeGames[gameServer.getPublicId()] = gameServer;

            this.listenGameServer(gameServer);

            if (!(createOptions.persist ?? true)) {
                return gameServer;
            }

            try {
                await gameServer.persist();
            } catch (e) {
                logger.error('Could not persist game after creation', {
                    gamePublicId: gameServer.getPublicId(),
                    message: e.message,
                    stack: e.stack,
                });

                throw e;
            }

            if (challengedOpponent !== null && !isRematch) {
                notifier.emit('gameChallengeCreated', game, challengedOpponent);
            }

            return gameServer;
        } finally {
            // Now either registered in activeGames (the authoritative check going forward)
            // or the whole creation failed: either way the reservation is no longer needed.
            if (challengeKey !== null) {
                this.pendingChallengeKeys.delete(challengeKey);
            }
        }
    }

    async rematchGame(host: Player, publicId: string): Promise<Game>
    {
        logger.info('rematch game', { hostPublicId: host.publicId, publicId });

        const game = await this.getActiveOrArchivedGame(publicId);

        if (game === null) {
            throw new GameError(`no game ${publicId}`);
        }
        if (!game.gameToPlayers.some(p => p.player.publicId === host.publicId)) {
            throw new GameError('Player not in the game');
        }
        if (game.rematch != null && this.activeGames[game.rematch.publicId]) {
            logger.info('rematch game: already has rematch, return', { publicId, rematchPublicId: game.rematch.publicId });
            return this.activeGames[game.rematch.publicId].getGame();
        }
        if (game.rematch != null) {
            throw new GameError('An inactive rematch game already exists');
        }
        if (this.activeGames[publicId]) {
            throw new GameError('Cannot rematch an active game');
        }

        const gameOptions = cloneGameOptions(game);

        // On rematch, the target is the opponent.
        // Also, since we clone previous gameOptions, prevent reusing same opponentPublicId,
        // and bug "cannot challenge self".
        const otherPlayer = getOtherPlayer(game, host);
        gameOptions.opponentPublicId = otherPlayer?.publicId ?? null;

        const params = { gameOptions, host, rematchedFrom: game };

        const rematch = await this.createGame(params, { persist: false, aiJoinAuto: false }); // do not persist because will persist later in the transaction, at same time as rematchId
        game.rematch = rematch.getGame();

        try {
            logger.info('persist rematch game, and rematched game', {
                game: game.publicId,
                rematch: game.rematch.publicId,
                rematchRematchedFrom: game.rematch.rematchedFrom?.publicId,
            });

            await this.gameRepository.persistMultiple([game, game.rematch]);

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

                game.rematch = await this.gameRepository.findRematch(game.id);

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

    getPlayerActiveGames(player: Player): GameServer[]
    {
        const gameServers: GameServer[] = [];

        for (const key in this.activeGames) {
            const gameServer = this.activeGames[key];

            if (
                !gameServer.isPlayerInGame(player)
                && !isChallengeTargetOf(gameServer.getGame(), player)
            ) {
                continue;
            }

            gameServers.push(gameServer);
        }

        return gameServers;
    }

    playerJoinGame(player: Player, gameId: string): string | true
    {
        const game = this.activeGames[gameId];

        if (!game) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const joinResult = game.playerJoin(player);

        if (typeof joinResult === 'string') {
            return joinResult;
        }

        return true;
    }

    playerMove(player: Player, gameId: string, move: HexMove): string | true
    {
        const game = this.activeGames[gameId];

        if (!game) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = game.playerMove(player, move);

        return result;
    }

    playerPremove(player: Player, gameId: string, premove: Premove): string | true
    {
        const game = this.activeGames[gameId];

        if (!game) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = game.playerPremove(player, premove);

        return result;
    }

    playerCancelPremove(player: Player, gameId: string): string | true
    {
        const game = this.activeGames[gameId];

        if (!game) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = game.playerCancelPremove(player);

        return result;
    }

    playerAskUndo(player: Player, gameId: string): string | true
    {
        const game = this.activeGames[gameId];

        if (!game) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = game.playerAskUndo(player);

        return result;
    }

    playerAnswerUndo(player: Player, gameId: string, accept: boolean): string | true
    {
        const game = this.activeGames[gameId];

        if (!game) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = game.playerAnswerUndo(player, accept);

        return result;
    }

    playerResign(player: Player, gameId: string): string | true
    {
        const game = this.activeGames[gameId];

        if (!game) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = game.playerResign(player);

        return result;
    }

    playerCancel(player: Player, gameId: string): string | true
    {
        const game = this.activeGames[gameId];

        if (!game) {
            return 'no active game ' + gameId;
        }

        this.onlinePlayerService.notifyPlayerActivity(player);

        const result = game.playerCancel(player);

        return result;
    }

    /**
     * @param publicId Game public id to post message on.
     * @param chatMessage ChatMessage to post, with player, content and date.
     *
     * @throws {RateLimitReachedError}
     * @throws {RateLimiterServerError}
     */
    async postChatMessage(publicId: string, chatMessage: ChatMessage): Promise<string | true>
    {
        if (chatMessage.player !== null) {
            this.onlinePlayerService.notifyPlayerActivity(chatMessage.player);

            if (await this.playerModerationActionRepository.isCurrentlyChatRestricted(chatMessage.player.publicId)) {
                return 'chat_restricted';
            }
        }

        if (chatMessage.player) {
            await rateLimiterConsumeChatMessage(chatMessage.player.publicId);
        }

        // shadow delete chat message if player is shadow banned for chat messages
        if (chatMessage.player?.shadowBanned && !whitelistedChatMessage[chatMessage.content]) {
            chatMessage.shadowDeleted = true;
        }

        const gameServer = this.activeGames[publicId];

        // Game is in memory, push chat message
        if (gameServer) {
            let error: true | string;
            if ((error = canChatMessageBePostedInGame(chatMessage, gameServer.getGame())) !== true) {
                return error;
            }

            gameServer.postChatMessage(chatMessage);
            return true;
        }

        // Game is not in memory, store chat message directly in database, on persisted game
        const game = await this.gameRepository.findUnique(publicId);

        if (game === null) {
            logger.notice('Tried to chat on a non-existant game', { chatMessage });
            return `Game ${publicId} not found`;
        }

        let error: true | string;
        if ((error = canChatMessageBePostedInGame(chatMessage, game)) !== true) {
            return error;
        }

        chatMessage.game = game;

        // Game is in database, insert chat message into database
        await this.chatMessageRepository.save(chatMessage);

        notifier.emit('chatMessage', game, chatMessage);

        this.gameEventEmitter.emitChat(game, chatMessage);

        return true;
    }

    moderateDeleteChatMessages(publicIds: string[]): number
    {
        const publicIdSet = new Set(publicIds);
        let deleted = 0;

        for (const key in this.activeGames) {
            for (const chatMessage of this.activeGames[key].getGame().chatMessages) {
                if (publicIdSet.has(chatMessage.publicId)) {
                    chatMessage.deletedByModeration = true;
                    ++deleted;
                }
            }
        }

        return deleted;
    }

    /**
     * Shadow delete player chat messages in active games
     */
    shadowDeletePlayerChatMessages(playerPublicId: string): number
    {
        let shadowDeleted = 0;

        for (const key in this.activeGames) {
            const activeGame = this.activeGames[key];

            for (const chatMessage of activeGame.getGame().chatMessages) {
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
