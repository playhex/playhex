import { HostedGame, HostedGameToPlayer } from '../../shared/app/models/index.js';
import { Inject, Service } from 'typedi';
import logger from '../services/logger.js';
import { FindManyOptions, FindOptionsRelations, IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import SearchGamesParameters from '../../shared/app/SearchGamesParameters.js';

/**
 * Relations to load in order to recreate an HostedGame in memory.
 */
const relations: FindOptionsRelations<HostedGame> = {
    chatMessages: {
        player: true,
    },
    rematch: true,
    rematchedFrom: true,
    gameData: true,
    gameOptions: true,
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

        @Inject('Repository<HostedGameToPlayer>')
        private hostedGameToPlayerRepository: Repository<HostedGameToPlayer>,
    ) {}

    async persist(hostedGame: HostedGame): Promise<void>
    {
        logger.info('Persisting a game...', { publicId: hostedGame.publicId });

        await this.hostedGameRepository.save(hostedGame);

        logger.info('Persisting done', { publicId: hostedGame.publicId, id: hostedGame.id });
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
        });
    }

    /**
     * Query builder with only oneToOne relations, and minimal data to apply filters.
     * Can be used to perform a count(*) without counting oneToMany relations.
     */
    private queryBuilderSearchMinimal(params: SearchGamesParameters): SelectQueryBuilder<HostedGame>
    {
        const queryBuilder = this.hostedGameRepository
            .createQueryBuilder('hostedGame')
            .comment('search hosted games')
            .leftJoin('hostedGame.gameData', 'gameData')
            .addSelect('gameData')
            .leftJoin('hostedGame.gameOptions', 'gameOptions')
            .addSelect('gameOptions')
            .take(params.paginationPageSize ?? 5)
            .skip((params.paginationPage ?? 0) * (params.paginationPageSize ?? 5))
        ;

        if (undefined !== params.opponentType) {
            queryBuilder
                .andWhere('gameOptions.opponentType = :opponentType')
                .setParameter('opponentType', params.opponentType)
            ;
        }

        if (undefined !== params.ranked) {
            queryBuilder
                .andWhere('gameOptions.ranked = :ranked')
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
                .andWhere('gameData.endedAt >= :fromEndedAt')
                .setParameter('fromEndedAt', params.fromEndedAt)
            ;
        }

        if (undefined !== params.toEndedAt) {
            queryBuilder
                .andWhere('gameData.endedAt <= :toEndedAt')
                .setParameter('toEndedAt', params.toEndedAt)
            ;
        }

        if (undefined !== params.endedAtSort) {
            queryBuilder.orderBy('gameData.endedAt', 'desc' === params.endedAtSort ? 'DESC' : 'ASC');
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
        const queryBuilder = this.queryBuilderSearch(params);

        const [results, count] = await queryBuilder.getManyAndCount();

        return {
            results,
            count,
        };
    }

    async searchStatsByDay(params: SearchGamesParameters): Promise<{ date: string, totalGames: number }[]>
    {
        const queryBuilder = this.queryBuilderSearchMinimal(params);

        queryBuilder
            .select('date(coalesce(gameData.endedAt, hostedGame.createdAt))', 'date')
            .addSelect('count(*) as totalGames')
            .groupBy('date(coalesce(gameData.endedAt, hostedGame.createdAt))')
            .orderBy('date(coalesce(gameData.endedAt, hostedGame.createdAt))', 'ASC')
        ;

        const results: { date: string, totalGames: string }[] = await queryBuilder.getRawMany();

        return results.map(result => ({
            date: result.date,
            totalGames: +result.totalGames,
        }));
    }
}
