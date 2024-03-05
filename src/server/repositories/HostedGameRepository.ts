import { Service } from 'typedi';
import HostedGame from '../HostedGame';
import { Move } from '../../shared/game-engine';
import { HostedGameData, HostedGameState, PlayerData } from '../../shared/app/Types';
import { GameOptionsData } from '../../shared/app/GameOptions';
import { MoveData } from '../../shared/game-engine/Types';
import { canChatMessageBePostedInGame } from '../../shared/app/chatUtils';
import HostedGamePersister from '../persistance/HostedGamePersister';
import logger from '../services/logger';
import { Prisma } from '@prisma/client';
import ChatMessage from '../../shared/app/models/ChatMessage';
import prisma from '../services/prisma';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import Rooms from '../../shared/app/Rooms';
import { HexServer } from '../server';

const byRecentFirst = (game0: HostedGameData, game1: HostedGameData): number => {
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
    ) {
        this.loadActiveGamesFromMemory();
    }

    private async loadActiveGamesFromMemory(): Promise<void>
    {
        const games = await this.hostedGamePersister.findMany({
            where: {
                OR: [
                    { state: 'created' },
                    { state: 'playing' },
                ],
            },
        });

        games.forEach(hostedGameData => {
            if (this.activeGames[hostedGameData.id]) {
                return;
            }

            this.activeGames[hostedGameData.id] = HostedGame.fromData(hostedGameData);

            this.enableAutoPersist(this.activeGames[hostedGameData.id]);
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
                logger.error('Could not persist a game. Continue with others.', { gameId: key, e });
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
        // Persist on ended
        const onEnded = () => {
            this.hostedGamePersister.persist(hostedGame.toData());
            delete this.activeGames[hostedGame.getId()];
        };

        if ('ended' === hostedGame.getState()) {
            onEnded();
        } else {
            hostedGame.on('ended', onEnded);
        }

        // Delete on canceled
        const onCanceled = () => {
            this.hostedGamePersister.deleteIfExists(hostedGame.toData());
            // Not delete now to let player see the canceled game for few time again.
            // Game will disappear totally on next server restart anyway.
        };

        if ('canceled' === hostedGame.getState()) {
            onCanceled();
        } else {
            hostedGame.on('canceled', onCanceled);
        }

        // Persist on no activity
        const resetTimeout = (): void => {
            if (this.persistWhenNoActivity[hostedGame.getId()]) {
                clearTimeout(this.persistWhenNoActivity[hostedGame.getId()]);
                delete this.persistWhenNoActivity[hostedGame.getId()];
            }
        };

        hostedGame.on('played', (): void => {
            resetTimeout();
            this.persistWhenNoActivity[hostedGame.getId()] = setTimeout(
                () => this.hostedGamePersister.persist(hostedGame.toData()),
                300 * 1000, // Persist after 5min inactivity
            );
        });

        hostedGame.on('ended', () => resetTimeout());
        hostedGame.on('canceled', () => resetTimeout());
    }

    getActiveGames(): { [key: string]: HostedGame }
    {
        return this.activeGames;
    }

    getActiveGame(gameId: string): null | HostedGame
    {
        return this.activeGames[gameId] ?? null;
    }

    getActiveGamesData(): HostedGameData[]
    {
        return Object.values(this.activeGames)
            .map(game => game.toData())
        ;
    }

    /**
     * @param fromGamePublicId Take N ended games from fromGamePublicId, or from start if not set.
     */
    async getEndedGames(take = 10, fromGamePublicId?: string): Promise<HostedGameData[]>
    {
        const args: Prisma.HostedGameFindManyArgs = {
            where: { state: 'ended' },
            orderBy: [
                { game: { endedAt: 'desc' } },
                { publicId: 'desc' }, // In case 2 games has same endedAt datetime, must keep a consistent order
            ],
            take,
        };

        if (undefined !== fromGamePublicId) {
            args.skip = 1;
            args.cursor = {
                publicId: fromGamePublicId,
            };
        }

        return await this.hostedGamePersister.findMany(args);
    }

    /**
     * Returns games to display initially on lobby.
     * Active games, plus some ended games.
     */
    async getLobbyGames(): Promise<HostedGameData[]>
    {
        const lobbyGames = this.getActiveGamesData();
        const endedGames = await this.getEndedGames(5);

        lobbyGames.push(...endedGames);

        return lobbyGames;
    }

    async getGame(publicId: string): Promise<HostedGameData | null>
    {
        if (this.activeGames[publicId]) {
            return this.activeGames[publicId].toData();
        }

        return await this.hostedGamePersister.findUnique(publicId);
    }

    async createGame(host: PlayerData, gameOptions: GameOptionsData, opponent: null | PlayerData = null): Promise<HostedGame>
    {
        const hostedGame = HostedGame.hostNewGame(gameOptions, host);

        if (null !== opponent) {
            hostedGame.playerJoin(opponent);
        }

        this.activeGames[hostedGame.getId()] = hostedGame;

        this.enableAutoPersist(hostedGame);

        return hostedGame;
    }

    /**
     * @param fromGamePublicId Cursor, retrieve games after this one.
     */
    async getPlayerGames(
        playerData: PlayerData,
        state: null | HostedGameState = null,
        fromGamePublicId: null | string = null,
    ): Promise<HostedGameData[]> {
        const hostedGameDataList: HostedGameData[] = [];

        for (const key in this.activeGames) {
            if (!this.activeGames[key].isPlayerInGame(playerData)) {
                continue;
            }

            if (null !== state && this.activeGames[key].getState() !== state) {
                continue;
            }

            hostedGameDataList.push(this.activeGames[key].toData());
        }

        hostedGameDataList.sort(byRecentFirst);

        const criteria: Prisma.HostedGameFindManyArgs = {
            where: {
                state: state ?? undefined,
                players: {
                    some: {
                        player: {
                            publicId: playerData.publicId,
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 20,
        };

        if (null !== fromGamePublicId) {
            criteria.cursor = { publicId: fromGamePublicId };
            criteria.skip = 1;
        }

        const gamesFromDb = await this.hostedGamePersister.findMany(criteria);

        hostedGameDataList.push(...gamesFromDb);

        return hostedGameDataList;
    }

    async playerJoinGame(playerData: PlayerData, gameId: string): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        const joinResult = hostedGame.playerJoin(playerData);

        if ('string' === typeof joinResult) {
            return joinResult;
        }

        return true;
    }

    async playerMove(playerData: PlayerData, gameId: string, move: MoveData): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        const result = hostedGame.playerMove(playerData, new Move(move.row, move.col));

        return result;
    }

    async playerResign(playerData: PlayerData, gameId: string): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        const result = hostedGame.playerResign(playerData);

        return result;
    }

    async playerCancel(playerData: PlayerData, gameId: string): Promise<string | true>
    {
        const hostedGame = this.activeGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        const result = hostedGame.playerCancel(playerData);

        return result;
    }

    async postChatMessage(chatMessage: ChatMessage): Promise<string | true>
    {
        try {
            await validateOrReject(plainToInstance(ChatMessage, chatMessage), {
                groups: ['post'],
            });
        } catch (e) {
            logger.error({ validationError: e });
            return e.message;
        }

        const { gameId } = chatMessage;
        const hostedGame = this.activeGames[gameId];

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
        const hostedGameData = await this.hostedGamePersister.findUnique(chatMessage.gameId);

        if (null === hostedGameData) {
            logger.notice('Tried to chat on a non-existant game', { chatMessage });
            return `Game ${chatMessage.gameId} not found`;
        }

        let error: true | string;
        if (true !== (error = canChatMessageBePostedInGame(chatMessage, hostedGameData))) {
            return error;
        }

        // Game is in database, insert chat message into database
        await prisma.chatMessage.create({
            data: {
                content: chatMessage.content,
                createdAt: chatMessage.createdAt,
                hostedGame: {
                    connect: {
                        publicId: hostedGameData.id,
                    },
                },
                player: {
                    connect: {
                        publicId: chatMessage.author?.publicId,
                    },
                },
            },
        });

        this.io.to(Rooms.game(chatMessage.gameId)).emit('chat', { ...chatMessage });

        return true;
    }
}
