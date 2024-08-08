import { Inject, Service } from 'typedi';
import HostedGameServer from '../HostedGameServer';
import { HostedGameState } from '../../shared/app/Types';
import { Player, ChatMessage, HostedGame, HostedGameOptions, Move, Rating } from '../../shared/app/models';
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
import RatingRepository from './RatingRepository';

export class GameError extends Error {}

const byRecentFirst = (game0: HostedGame, game1: HostedGame): number => {
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
    private activeGames: { [key: string]: HostedGameServer } = {};

    /**
     * Keep timeout thread id of hosted games to persist in N minutes
     * if no activity.
     * Prevent too much data loss in case server crashes.
     */
    private persistWhenNoActivity: { [key: string]: NodeJS.Timeout } = {};

    constructor(
        private hostedGamePersister: HostedGamePersister,
        private io: HexServer,
        private ratingRepository: RatingRepository,

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

            this.activeGames[hostedGame.publicId] = HostedGameServer.fromData(hostedGame);

            this.listenHostedGameServer(this.activeGames[hostedGame.publicId]);
        }

        logger.info(`${games.length} games loaded.`);
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

    private listenHostedGameServer(hostedGameServer: HostedGameServer): void
    {
        if ('ended' === hostedGameServer.getState()) {
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
        this.persistWhenNoActivity[hostedGameServer.getId()] = setTimeout(
            () => this.hostedGamePersister.persist(hostedGameServer.toData()),
            300 * 1000, // Persist after 5min inactivity
        );
    }

    /**
     * Cancel planned persist
     */
    private clearActivityTimeout(hostedGameServer: HostedGameServer): void
    {
        if (this.persistWhenNoActivity[hostedGameServer.getId()]) {
            clearTimeout(this.persistWhenNoActivity[hostedGameServer.getId()]);
            delete this.persistWhenNoActivity[hostedGameServer.getId()];
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
        const hostedGame = hostedGameServer.toData();
        await this.hostedGamePersister.persist(hostedGame);
        delete this.activeGames[hostedGameServer.getId()];
    }

    /**
     * Things to do when game has ended
     */
    private async onGameEnded(hostedGameServer: HostedGameServer): Promise<void>
    {
        await this.flushHostedGame(hostedGameServer);

        if (hostedGameServer.toData().gameOptions.ranked) {
            const newRatings = await this.updateRatings(hostedGameServer);

            this.io
                .to([
                    Rooms.game(hostedGameServer.getId()),
                    Rooms.lobby,
                ])
                .emit(
                    'ratingsUpdated',
                    hostedGameServer.getId(),
                    newRatings.filter(rating => 'overall' === rating.category),
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
        const newRatings = await this.ratingRepository.updateAfterGame(hostedGameServer.toData());

        await this.ratingRepository.persistRatings(newRatings);
        await this.playerRepository.save(hostedGameServer.getPlayers());

        return newRatings;
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
            .map(game => game.toData())
        ;
    }

    /**
     * Get finished games; bot games are ignored.
     * @param fromGamePublicId Take N ended games from fromGamePublicId, or from start if not set.
     */
    async getEndedGames(take = 10, fromGamePublicId?: string): Promise<HostedGame[]>
    {
        return await this.hostedGamePersister.findLastEnded1v1(take, fromGamePublicId);
    }

    /**
     * Returns games to display initially on lobby.
     * Active games, plus some ended games.
     */
    async getLobbyGames(): Promise<HostedGame[]>
    {
        const lobbyGames = this.getActiveGamesData();
        const endedGames = await this.getEndedGames(5);

        lobbyGames.push(...endedGames);

        return lobbyGames;
    }

    async getGame(publicId: string): Promise<HostedGame | null>
    {
        if (this.activeGames[publicId]) {
            return this.activeGames[publicId].toData();
        }

        return await this.hostedGamePersister.findUnique(publicId);
    }

    async createGame(host: Player, gameOptions: HostedGameOptions, rematchedFrom: null | HostedGame = null): Promise<HostedGameServer>
    {
        const hostedGame = HostedGameServer.hostNewGame(gameOptions, host, rematchedFrom);

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

        this.listenHostedGameServer(hostedGame);

        return hostedGame;
    }

    async rematchGame(host: Player, gameId: string): Promise<HostedGameServer>
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

        const rematch = await this.createGame(host, cloneGameOptions(game.gameOptions), game);
        this.io.to(Rooms.game(game.publicId))
            .emit('rematchAvailable', game.publicId, rematch.getId());

        game.rematch = rematch.toData();

        try {
            await this.hostedGamePersister.persist(game.rematch);
            await this.hostedGamePersister.persistLinkToRematch(game);
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
    ): Promise<HostedGame[]> {
        const hostedGameList: HostedGame[] = [];

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

    async playerAskUndo(player: Player, gameId: string): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        const result = hostedGame.playerAskUndo(player);

        return result;
    }

    async playerAnswerUndo(player: Player, gameId: string, accept: boolean): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        const result = hostedGame.playerAnswerUndo(player, accept);

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

        const hostedGameServer = this.activeGames[publicId];

        // Game is in memory, push chat message
        if (hostedGameServer) {
            let error: true | string;
            if (true !== (error = canChatMessageBePostedInGame(chatMessage, hostedGameServer.toData()))) {
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

        this.io.to(Rooms.game(publicId)).emit('chat', publicId, chatMessage);

        return true;
    }
}
