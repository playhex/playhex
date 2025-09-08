import { HostedGame } from '../../shared/app/models/index.js';
import { Inject, Service } from 'typedi';
import logger from '../services/logger.js';
import { FindManyOptions, FindOptionsOrder, FindOptionsRelations, IsNull, Not, Repository, SelectQueryBuilder } from 'typeorm';
import SearchGamesParameters from '../../shared/app/SearchGamesParameters.js';
import { AnalyzeGameRequest } from 'services/HexAiApiClient.js';
import Move from '../../shared/game-engine/Move.js';

/**
 * Relations to load in order to recreate an HostedGame in memory.
 */
const relations: FindOptionsRelations<HostedGame> = {
    chatMessages: {
        player: true,
    },
    rematch: {
        host: true,
        hostedGameToPlayers: {
            player: {
                currentRating: true,
            },
        },
    },
    rematchedFrom: {
        hostedGameToPlayers: {
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
    hostedGameToPlayers: {
        player: {
            currentRating: true,
        },
    },
    tournamentMatch: {
        tournament: true,
    },
};

const order: FindOptionsOrder<HostedGame> = {
    chatMessages: {
        createdAt: 'asc',
    },
    hostedGameToPlayers: {
        order: 'asc',
    },
};

/**
 * Layer between HostedGame and database.
 */
@Service()
export default class HostedGamePersister
{
    constructor(
        @Inject('Repository<HostedGame>')
        private hostedGameRepository: Repository<HostedGame>,
    ) {}

    async persist(hostedGame: HostedGame): Promise<HostedGame>
    {
        logger.info('Persisting a game...', { publicId: hostedGame.publicId });

        const result = await this.hostedGameRepository.save(hostedGame);

        logger.info('Hosted game persisting done', { publicId: hostedGame.publicId, id: hostedGame.id });

        return result;
    }

    async deleteIfExists(hostedGame: HostedGame): Promise<void>
    {
        logger.info('Delete a game if exists...', { publicId: hostedGame.publicId });

        await this.hostedGameRepository.remove(hostedGame);

        logger.info('Deleted.', { publicId: hostedGame.publicId, hostedGame });
    }

    async findUnique(publicId: string): Promise<null | HostedGame>
    {
        return await this.hostedGameRepository.findOne({
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

    async findRematch(rematchedFromId: number): Promise<null | HostedGame>
    {
        return await this.hostedGameRepository.findOne({
            relations,
            order,
            where: {
                rematchedFrom: {
                    id: rematchedFromId,
                },
            },
        });
    }

    async findMany(criteria?: FindManyOptions<HostedGame>): Promise<HostedGame[]>
    {
        return await this.hostedGameRepository.find({
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
        const data = await this.hostedGameRepository.findOne({
            select: {
                boardsize: true,
                movesHistory: true,
            },
            where: {
                publicId,
                endedAt: Not(IsNull()),
            },
        });

        if (data === null) {
            return null;
        }

        const { movesHistory, boardsize } = data;

        if (!Array.isArray(movesHistory)) {
            throw new Error('Unexpected data in game.movesHistory');
        }

        return {
            size: boardsize,
            movesHistory: Move.movesAsString(movesHistory
                .map(moveData => Move.fromData(moveData)),
            ),
        };
    }

    /**
     * Query builder with only oneToOne relations, and minimal data to apply filters.
     * Can be used to perform a count(*) without counting oneToMany relations.
     *
     * @param withPagination Set false to ignore pagination parameters, used to count(*) all games
     */
    private queryBuilderSearchMinimal(params: SearchGamesParameters, withPagination = true): SelectQueryBuilder<HostedGame>
    {
        const queryBuilder = this.hostedGameRepository
            .createQueryBuilder('hostedGame')
            .comment('search hosted games')
        ;

        if (withPagination) {
            queryBuilder
                .take(params.paginationPageSize ?? 5)
                .skip((params.paginationPage ?? 0) * (params.paginationPageSize ?? 5))
            ;
        }

        if (undefined !== params.opponentType) {
            queryBuilder
                .andWhere('hostedGame.opponentType = :opponentType')
                .setParameter('opponentType', params.opponentType)
            ;
        }

        if (undefined !== params.ranked) {
            queryBuilder
                .andWhere('hostedGame.ranked = :ranked')
                .setParameter('ranked', params.ranked)
            ;
        }

        if (undefined !== params.players) {
            /*
                Filter games containing player0 AND player1 (if defined).

                select *
                from hosted_game_to_player a
                inner join hosted_game_to_player b
                    on a.hostedGameId = b.hostedGameId
                    and a.playerId != b.playerId
                left join player pa on a.playerId = pa.id
                left join player pb on b.playerId = pb.id
                where pa.publicId = ... and pa... = ...
                and pb.publicId = ... and pb... = ...
            */
            const [playerA, playerB] = params.players;

            if (undefined !== playerA?.publicId) {
                queryBuilder
                    .innerJoin('hostedGame.hostedGameToPlayers', 'a')
                    .leftJoin('a.player', 'playerA')
                    .andWhere('playerA.publicId = :playerAPublicId')
                    .setParameter('playerAPublicId', playerA.publicId)
                ;
            }

            if (undefined !== playerB?.publicId) {
                queryBuilder
                    .innerJoin('hostedGame.hostedGameToPlayers', 'b', 'a.hostedGameId = b.hostedGameId and a.playerId != b.playerId')
                    .leftJoin('b.player', 'playerB')
                    .andWhere('playerB.publicId = :playerBPublicId')
                    .setParameter('playerBPublicId', playerB.publicId)
                ;
            }
        }

        if (Array.isArray(params.states) && params.states.length > 0) {
            queryBuilder
                .andWhere('hostedGame.state in (:states)')
                .setParameter('states', params.states)
            ;
        }

        if (undefined !== params.fromEndedAt) {
            queryBuilder
                .andWhere('hostedGame.endedAt >= :fromEndedAt')
                .setParameter('fromEndedAt', params.fromEndedAt)
            ;
        }

        if (undefined !== params.toEndedAt) {
            queryBuilder
                .andWhere('hostedGame.endedAt <= :toEndedAt')
                .setParameter('toEndedAt', params.toEndedAt)
            ;
        }

        if (undefined !== params.endedAtSort) {
            queryBuilder.orderBy('hostedGame.endedAt', params.endedAtSort === 'desc' ? 'DESC' : 'ASC');
        }

        return queryBuilder;
    }

    /**
     * Search with all required relations.
     * Can be used to return all game data.
     */
    private queryBuilderSearch(params: SearchGamesParameters): SelectQueryBuilder<HostedGame>
    {
        return this.queryBuilderSearchMinimal(params)
            .leftJoin('hostedGame.host', 'playerHost')
            .addSelect('playerHost')
            .leftJoin('playerHost.currentRating', 'hostCurrentRating')
            .addSelect('hostCurrentRating')
            .leftJoin('hostedGame.hostedGameToPlayers', 'hostedGameToPlayer')
            .addSelect('hostedGameToPlayer')
            .leftJoin('hostedGameToPlayer.player', 'player')
            .addSelect('player')
            .leftJoin('player.currentRating', 'currentRating')
            .addSelect('currentRating')
        ;
    }

    async search(params: SearchGamesParameters): Promise<{ results: HostedGame[], count: number }>
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
            .select('date(hostedGame.endedAt)', 'date')
            .addSelect('count(*) as totalGames')
            .andWhere('hostedGame.endedAt is not null')
            .groupBy('date(hostedGame.endedAt)')
            .orderBy('date(hostedGame.endedAt)', 'ASC')
        ;

        const results: { date: string, totalGames: string }[] = await queryBuilder.getRawMany();

        return results.map(result => ({
            date: result.date,
            totalGames: +result.totalGames,
        }));
    }
}
