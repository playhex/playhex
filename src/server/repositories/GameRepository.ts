import { Game } from '../../shared/app/models/index.js';
import { Inject, Service } from 'typedi';
import logger from '../services/logger.js';
import { FindManyOptions, FindOptionsOrder, FindOptionsRelations, IsNull, Not, Repository, SelectQueryBuilder } from 'typeorm';
import SearchGamesParameters from '../../shared/app/SearchGamesParameters.js';
import { AnalyzeGameRequest } from '../services/HexAiApiClient.js';

/**
 * Relations to load in order to recreate an Game in memory.
 */
const relations: FindOptionsRelations<Game> = {
    chatMessages: {
        player: true,
    },
    rematch: {
        host: true,
        gameToPlayers: {
            player: {
                currentRating: true,
            },
        },
    },
    rematchedFrom: {
        gameToPlayers: {
            player: {
                currentRating: true,
            },
        },
    },
    ratings: {
        player: true,
    },
    host: {
        currentRating: true,
    },
    gameToPlayers: {
        player: {
            currentRating: true,
        },
    },
    tournamentMatch: {
        tournament: true,
    },
};

const order: FindOptionsOrder<Game> = {
    chatMessages: {
        createdAt: 'asc',
    },
    gameToPlayers: {
        order: 'asc',
    },
};

/**
 * Layer between Game and database.
 */
@Service()
export default class GameRepository
{
    constructor(
        @Inject('Repository<Game>')
        private gameRepository: Repository<Game>,
    ) {}

    async persist(game: Game): Promise<Game>
    {
        logger.info('Persisting a game...', { publicId: game.publicId });

        const result = await this.gameRepository.save(game);

        logger.info('Game persisting done', { publicId: game.publicId, id: game.id });

        return result;
    }

    /**
     * Persist multiple game in a transaction.
     * Used to persist game and its rematch, with rematch from and to.
     */
    async persistMultiple(games: Game[]): Promise<Game[]>
    {
        return await this.gameRepository.save(games, {
            transaction: true,
        });
    }

    async deleteIfExists(game: Game): Promise<void>
    {
        logger.info('Delete a game if exists...', { publicId: game.publicId });

        await this.gameRepository.remove(game);

        logger.info('Deleted.', { publicId: game.publicId, game });
    }

    async findUnique(publicId: string): Promise<null | Game>
    {
        return await this.gameRepository.findOne({
            relations,
            order,
            where: {
                publicId: publicId,
                ratings: [
                    { category: 'overall' },
                    { category: IsNull() },
                ],
            },
        });
    }

    async findRematch(rematchedFromId: number): Promise<null | Game>
    {
        return await this.gameRepository.findOne({
            relations,
            order,
            where: {
                rematchedFrom: {
                    id: rematchedFromId,
                },
            },
        });
    }

    async findMany(criteria?: FindManyOptions<Game>): Promise<Game[]>
    {
        return await this.gameRepository.find({
            ...criteria,
            relations,
            order,
        });
    }

    /**
     * Get only data required for a game analyze.
     * Game must have ended.
     */
    async getAnalyzeGameRequest(publicId: string): Promise<null | AnalyzeGameRequest>
    {
        const game = await this.gameRepository.findOne({
            select: {
                boardsize: true,
                moves: true,
            },
            where: {
                publicId,
                endedAt: Not(IsNull()),
            },
        });

        if (game === null) {
            return null;
        }

        const { moves, boardsize } = game;

        if (!Array.isArray(moves)) {
            throw new Error('Unexpected data in game.movesHistory');
        }

        return {
            size: boardsize,
            movesHistory: moves.join(' '),
        };
    }

    /**
     * Query builder with only oneToOne relations, and minimal data to apply filters.
     * Can be used to perform a count(*) without counting oneToMany relations.
     *
     * @param withPagination Set false to ignore pagination parameters, used to count(*) all games
     */
    private queryBuilderSearchMinimal(params: SearchGamesParameters, withPagination = true): SelectQueryBuilder<Game>
    {
        const queryBuilder = this.gameRepository
            .createQueryBuilder('game')
            .comment('search games')
        ;

        if (withPagination) {
            queryBuilder
                .take(params.paginationPageSize ?? 5)
                .skip((params.paginationPage ?? 0) * (params.paginationPageSize ?? 5))
            ;
        }

        if (undefined !== params.opponentType) {
            queryBuilder
                .andWhere('game.opponentType = :opponentType')
                .setParameter('opponentType', params.opponentType)
            ;
        }

        if (undefined !== params.ranked) {
            queryBuilder
                .andWhere('game.ranked = :ranked')
                .setParameter('ranked', params.ranked)
            ;
        }

        if (undefined !== params.players) {
            /*
                Filter games containing player0 AND player1 (if defined).

                select *
                from game_to_player a
                inner join game_to_player b
                    on a.gameId = b.gameId
                    and a.playerId != b.playerId
                left join player pa on a.playerId = pa.id
                left join player pb on b.playerId = pb.id
                where pa.publicId = ... and pa... = ...
                and pb.publicId = ... and pb... = ...
            */
            const [playerA, playerB] = params.players;

            if (undefined !== playerA?.publicId) {
                queryBuilder
                    .innerJoin('game.gameToPlayers', 'a')
                    .leftJoin('a.player', 'playerA')
                    .andWhere('playerA.publicId = :playerAPublicId')
                    .setParameter('playerAPublicId', playerA.publicId)
                ;
            }

            if (undefined !== playerB?.publicId) {
                queryBuilder
                    .innerJoin('game.gameToPlayers', 'b', 'a.gameId = b.gameId and a.playerId != b.playerId')
                    .leftJoin('b.player', 'playerB')
                    .andWhere('playerB.publicId = :playerBPublicId')
                    .setParameter('playerBPublicId', playerB.publicId)
                ;
            }
        }

        if (Array.isArray(params.states) && params.states.length > 0) {
            queryBuilder
                .andWhere('game.state in (:states)')
                .setParameter('states', params.states)
            ;
        }

        if (undefined !== params.fromEndedAt) {
            queryBuilder
                .andWhere('game.endedAt >= :fromEndedAt')
                .setParameter('fromEndedAt', params.fromEndedAt)
            ;
        }

        if (undefined !== params.toEndedAt) {
            queryBuilder
                .andWhere('game.endedAt <= :toEndedAt')
                .setParameter('toEndedAt', params.toEndedAt)
            ;
        }

        if (undefined !== params.endedAtSort) {
            queryBuilder.orderBy('game.endedAt', params.endedAtSort === 'desc' ? 'DESC' : 'ASC');
        }

        return queryBuilder;
    }

    /**
     * Search with all required relations.
     * Can be used to return all game data.
     */
    private queryBuilderSearch(params: SearchGamesParameters): SelectQueryBuilder<Game>
    {
        return this.queryBuilderSearchMinimal(params)
            .leftJoin('game.host', 'playerHost')
            .addSelect('playerHost')
            .leftJoin('playerHost.currentRating', 'hostCurrentRating')
            .addSelect('hostCurrentRating')
            .leftJoin('game.gameToPlayers', 'gameToPlayer')
            .addSelect('gameToPlayer')
            .leftJoin('gameToPlayer.player', 'player')
            .addSelect('player')
            .leftJoin('player.currentRating', 'currentRating')
            .addSelect('currentRating')
        ;
    }

    async search(params: SearchGamesParameters): Promise<{ results: Game[], count: number }>
    {
        // cannot use getManyAndCount because the many is fast because indexed and paginated,
        // but the count part will fetch all data relations, not paginated, just to count.
        return {
            results: await this.queryBuilderSearch(params).getMany(),
            count: await this.queryBuilderSearchMinimal(params).getCount(),
        };
    }

    async searchStatsByDay(params: SearchGamesParameters): Promise<{ date: string, totalGames: number }[]>
    {
        const queryBuilder = this.queryBuilderSearchMinimal(params, false);

        // we search stats only on ended games, so endedAt should not be null
        queryBuilder
            .select('date(game.endedAt)', 'date')
            .addSelect('count(*) as totalGames')
            .andWhere('game.endedAt is not null')
            .groupBy('date(game.endedAt)')
            .orderBy('date(game.endedAt)', 'ASC')
        ;

        const results: { date: string, totalGames: string }[] = await queryBuilder.getRawMany();

        return results.map(result => ({
            date: result.date,
            totalGames: +result.totalGames,
        }));
    }

    /**
     * Retrieve game in which a chatMessage has been posted.
     */
    async findGameFromChatMessage(chatMessagePublicId: string): Promise<null | Game>
    {
        const game = await this.gameRepository.findOne({
            relations: {
                gameToPlayers: {
                    player: true,
                },
            },
            where: {
                chatMessages: {
                    publicId: chatMessagePublicId,
                },
            },
        });

        return game;
    };
}
