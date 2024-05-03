import { Prisma } from '@prisma/client';
import { HostedGameData, HostedGameState } from '../../shared/app/Types';
import Player from '../../shared/app/models/Player';
import { PlayerIndex } from '../../shared/game-engine';
import { MoveData, Outcome } from '../../shared/game-engine/Types';
import { defaultGameOptions } from '../../shared/app/GameOptions';
import TimeControlType from '../../shared/time-control/TimeControlType';
import prisma from '../services/prisma';
import { Service } from 'typedi';
import { GameTimeData, PlayerTimeData } from '../../shared/time-control/TimeControl';
import logger from '../services/logger';
import { ByoYomiPlayerTimeData } from '@shared/time-control/time-controls/ByoYomiTimeControl';
import PlayerPersister, { select as playerSelect } from './PlayerPersister';
import ChatMessage from '@shared/app/models/ChatMessage';

export type HostedGameDBFull = Prisma.HostedGameGetPayload<{
    include: {
        game: true;
        host: {
            select: typeof playerSelect;
        };
        options: true;
        chatMessages: {
            include: {
                player: {
                    select: typeof playerSelect;
                };
            };
        };
        players: {
            include: {
                player: {
                    select: typeof playerSelect;
                };
            };
        };
    };
}>;

const select: Prisma.HostedGameSelect = {
    publicId: true,
    createdAt: true,
    state: true,
    options: true,
    host: {
        select: playerSelect,
    },
    players: {
        select: {
            player: {
                select: playerSelect,
            },
        },
        orderBy: {
            order: 'asc',
        },
    },
    timeControl: true,
    chatMessages: {
        include: {
            player: {
                select: playerSelect,
            },
        },
        orderBy: {
            createdAt: 'asc',
        },
    },
    game: {
        select: {
            currentPlayerIndex: true,
            endedAt: true,
            movesHistory: true,
            allowSwap: true,
            lastMoveAt: true,
            outcome: true,
            size: true,
            startedAt: true,
            winner: true,
        },
    },
    rematchId: true
};

/**
 * Layer between HostedGameData and database.
 */
@Service()
export default class HostedGamePersister
{
    private idFromPublicId: { [key: string]: number } = {};

    constructor(
        private playerPersister: PlayerPersister,
    ) {}

    private async getIdFromPublicId(publicId: string): Promise<null | number>
    {
        if (this.idFromPublicId[publicId]) {
            return this.idFromPublicId[publicId];
        }

        const hostedGame = await prisma.hostedGame.findUnique({
            select: {
                id: true,
            },
            where: {
                publicId,
            },
        });

        if (null === hostedGame) {
            return null;
        }

        return this.idFromPublicId[publicId] = hostedGame.id;
    }

    async persist(hostedGameData: HostedGameData): Promise<void>
    {
        logger.info('Persisting a game...', { publicId: hostedGameData.id });

        const hostedGameId = await this.getIdFromPublicId(hostedGameData.id);

        const dbData = null === hostedGameId
            ? await this.doCreate(hostedGameData)
            : await this.doUpdate(hostedGameData, hostedGameId)
        ;

        this.idFromPublicId[hostedGameData.id] = dbData.id;

        logger.info('Persisting done', { publicId: hostedGameData.id, id: dbData.id });
    }

    async deleteIfExists(hostedGameData: HostedGameData): Promise<void>
    {
        logger.info('Delete a game if exists...', { publicId: hostedGameData.id });

        const hostedGameId = await this.getIdFromPublicId(hostedGameData.id);

        if (null === hostedGameId) {
            logger.info('Was not existing, nothing done.', { publicId: hostedGameData.id });
            return;
        }

        prisma.$transaction([
            prisma.hostedGameOptions.deleteMany({
                where: { hostedGameId },
            }),
            prisma.hostedGameToPlayer.deleteMany({
                where: { hostedGameId },
            }),
            prisma.hostedGameOptions.deleteMany({
                where: { hostedGameId },
            }),
            prisma.game.deleteMany({
                where: { hostedGameId },
            }),
            prisma.hostedGame.deleteMany({
                where: { id: hostedGameId },
            }),
        ]);

        logger.info('Deleted.', { publicId: hostedGameData.id, hostedGameId });
    }

    async findUnique(publicId: string): Promise<null | HostedGameData>
    {
        const dbData = await prisma.hostedGame.findUnique({
            where: {
                publicId,
            },
            select,
        });

        if (null === dbData) {
            return null;
        }

        return this.fromDbData(dbData as unknown as HostedGameDBFull);
    }

    async findMany(criteria?: Prisma.HostedGameFindManyArgs): Promise<HostedGameData[]>
    {
        const allDbData = await prisma.hostedGame.findMany({
            ...criteria,
            select,
        });

        return allDbData.map(dbData => this.fromDbData(dbData as unknown as HostedGameDBFull));
    }

    private fromDbData(dbData: HostedGameDBFull): HostedGameData
    {
        const { game, options } = dbData;
        const timeControl = dbData.timeControl as unknown as GameTimeData;

        try {
            return {
                id: dbData.publicId,
                host: dbData.host,
                createdAt: dbData.createdAt,
                players: dbData.players.map(p => p.player),
                state: dbData.state as HostedGameState,
                rematchId: dbData.rematchId ?? null,
                gameData: null === game ? null : {
                    ...game,
                    movesHistory: game.movesHistory as unknown as MoveData[],
                    currentPlayerIndex: game.currentPlayerIndex as PlayerIndex,
                    winner: game.winner as null | PlayerIndex,
                    outcome: game.outcome as Outcome,
                },
                gameOptions: null === options ? defaultGameOptions : {
                    ...options,
                    opponent: {
                        type: options.opponentType as 'player' | 'ai' ?? defaultGameOptions.opponent.type,
                        publicId: options.opponentPublicId ?? undefined,
                    },
                    firstPlayer: options.firstPlayer as PlayerIndex,
                    timeControl: {
                        type: options.timeControlType,
                        options: options.timeControlOptions,
                    } as unknown as TimeControlType,
                },
                timeControl: {
                    state: timeControl.state,
                    currentPlayer: timeControl.currentPlayer,
                    players: timeControl.players.map((p: PlayerTimeData | ByoYomiPlayerTimeData) => ({
                        ...p,
                        totalRemainingTime: 'number' === typeof p.totalRemainingTime
                            ? p.totalRemainingTime
                            : new Date(p.totalRemainingTime)
                        ,
                        remainingMainTime: undefined === (p as ByoYomiPlayerTimeData).remainingMainTime
                            ? undefined
                            : (
                                'number' === typeof p.totalRemainingTime
                                    ? p.totalRemainingTime
                                    : new Date((p as ByoYomiPlayerTimeData).remainingMainTime)
                            )
                        ,
                        remainingPeriods: undefined === (p as ByoYomiPlayerTimeData).remainingPeriods
                            ? undefined
                            : (p as ByoYomiPlayerTimeData).remainingPeriods
                        ,
                    })) as [PlayerTimeData | ByoYomiPlayerTimeData, PlayerTimeData | ByoYomiPlayerTimeData],
                },
                chatMessages: dbData.chatMessages.map(chatMessage => ({
                    persisted: true,
                    author: chatMessage.player,
                    content: chatMessage.content,
                    createdAt: chatMessage.createdAt,
                    gameId: dbData.publicId,
                })),
            };
        } catch (e) {
            logger.error('Error while creating HostedGameData from db data', {
                dbData,
                e,
            });

            throw e;
        }
    }

    private playerConnectOrCreate(player: Player): Prisma.PlayerCreateOrConnectWithoutGamesAsHostInput
    {
        return {
            where: {
                publicId: player.publicId,
            },
            create: {
                publicId: player.publicId,
                pseudo: player.pseudo,
                slug: player.slug,
                isGuest: player.isGuest,
                isBot: player.isBot,
                createdAt: player.createdAt,
            },
        };
    }

    private async chatMessagesToData(chatMessages: ChatMessage[]): Promise<Prisma.ChatMessageCreateManyHostedGameInput[]>
    {
        const prismaChatMessages: Prisma.ChatMessageCreateManyHostedGameInput[] = [];

        for (let i = 0; i < chatMessages.length; ++i) {
            const chat = chatMessages[i];

            if (chat.persisted) {
                continue;
            }

            prismaChatMessages.push({
                content: chat.content,
                createdAt: chat.createdAt,
                playerId: null === chat.author
                    ? null
                    : await this.playerPersister.getPlayerIdFromPublicId(chat.author.publicId)
                ,
            });
        }

        return prismaChatMessages;
    }

    private markChatMessagesAsPersisted(chatMessages: ChatMessage[]): void
    {
        for (let i = 0; i < chatMessages.length; ++i) {
            chatMessages[i].persisted = true;
        }
    }

    private async doCreate(data: HostedGameData)
    {
        const { gameData, gameOptions } = data;

        const result = await prisma.hostedGame.create({
            select: {
                id: true,
            },
            data: {
                publicId: data.id,
                createdAt: data.createdAt,
                state: data.state,
                host: {
                    connectOrCreate: this.playerConnectOrCreate(data.host),
                },
                game: null === gameData ? undefined : {
                    create: {
                        allowSwap: gameData.allowSwap,
                        currentPlayerIndex: gameData.currentPlayerIndex,
                        size: gameData.size,
                        startedAt: gameData.startedAt,
                        endedAt: gameData.endedAt,
                        lastMoveAt: gameData.lastMoveAt,
                        outcome: gameData.outcome,
                        winner: gameData.winner,
                        movesHistory: gameData.movesHistory,
                    },
                },
                players: {
                    create: data.players.map((player, order) => ({
                        order,
                        player: {
                            connectOrCreate: this.playerConnectOrCreate(player),
                        },
                    })),
                },
                options: {
                    create: {
                        boardsize: gameOptions.boardsize,
                        swapRule: gameOptions.swapRule,
                        firstPlayer: gameOptions.firstPlayer,
                        opponentType: gameOptions.opponent.type,
                        opponentPublicId: gameOptions.opponent.publicId,
                        timeControlType: gameOptions.timeControl.type,
                        timeControlOptions: gameOptions.timeControl.options as object,
                    },
                },
                rematchId: data.rematchId ?? undefined,
                timeControl: data.timeControl as object,
                chatMessages: {
                    createMany: {
                        data: await this.chatMessagesToData(data.chatMessages),
                    },
                },
            },
        });

        this.markChatMessagesAsPersisted(data.chatMessages);

        return result;
    }

    private async doUpdate(data: HostedGameData, hostedGameId: number)
    {
        const { gameData, gameOptions } = data;

        const result = prisma.hostedGame.update({
            select: {
                id: true,
            },
            where: {
                id: hostedGameId,
            },
            data: {
                state: data.state,
                game: null === gameData ? undefined : {
                    upsert: {
                        where: {
                            hostedGameId,
                        },
                        create: {
                            allowSwap: gameData.allowSwap,
                            currentPlayerIndex: gameData.currentPlayerIndex,
                            size: gameData.size,
                            startedAt: gameData.startedAt,
                            endedAt: gameData.endedAt,
                            lastMoveAt: gameData.lastMoveAt,
                            outcome: gameData.outcome,
                            winner: gameData.winner,
                            movesHistory: gameData.movesHistory,
                        },
                        update: {
                            allowSwap: gameData.allowSwap,
                            currentPlayerIndex: gameData.currentPlayerIndex,
                            size: gameData.size,
                            startedAt: gameData.startedAt,
                            endedAt: gameData.endedAt,
                            lastMoveAt: gameData.lastMoveAt,
                            outcome: gameData.outcome,
                            winner: gameData.winner,
                            movesHistory: gameData.movesHistory,
                        },
                    },
                },
                players: {
                    upsert: data.players.map((player, order) => ({
                        where: {
                            hostedGameId_order: {
                                hostedGameId,
                                order,
                            },
                        },
                        create: {
                            order,
                            player: {
                                connectOrCreate: this.playerConnectOrCreate(player),
                            },
                        },
                        update: {
                            order,
                            player: {
                                connectOrCreate: this.playerConnectOrCreate(player),
                            },
                        },
                    })),
                },
                options: {
                    connectOrCreate: {
                        where: {
                            hostedGameId,
                        },
                        create: {
                            boardsize: gameOptions.boardsize,
                            swapRule: gameOptions.swapRule,
                            firstPlayer: gameOptions.firstPlayer,
                            opponentType: gameOptions.opponent.type,
                            opponentPublicId: gameOptions.opponent.publicId,
                            timeControlType: gameOptions.timeControl.type,
                            timeControlOptions: gameOptions.timeControl.options as object,
                        },
                    },
                },
                rematchId: data.rematchId ?? undefined,
                timeControl: data.timeControl as object,
                chatMessages: {
                    createMany: {
                        data: await this.chatMessagesToData(data.chatMessages),
                    },
                },
            },
        });

        this.markChatMessagesAsPersisted(data.chatMessages);

        return result;
    }
}
