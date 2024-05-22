import { HostedGame, Player } from '../../shared/app/models';
import { Inject, Service } from 'typedi';
import logger from '../services/logger';
import { And, FindManyOptions, FindOptionsRelations, In, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';

/**
 * Relations to load in order to recreate an HostedGame in memory.
 */
const relations: FindOptionsRelations<HostedGame> = {
    chatMessages: {
        player: true,
    },
    rematch: true,
    gameData: true,
    gameOptions: true,
    host: true,
    hostedGameToPlayers: {
        player: true,
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

    async findLastEnded1v1(take = 5, fromGamePublicId?: string): Promise<HostedGame[]>
    {
        // Options to get all games not in bot games
        const options: FindManyOptions<HostedGame> = {
            comment: 'find last ended 1v1',
            relations,
            where: {
                state: 'ended',
                gameOptions: {
                    opponentType: 'player',
                },
                gameData: {
                    endedAt: Not(IsNull()), // Works without, but query is slower
                },
            },
            order: {
                gameData: {
                    endedAt: 'desc',
                },
            },
            take,
        };

        // Alter options to get only older than cursor if defined
        if (undefined !== fromGamePublicId) {
            const cursor = await this.hostedGameRepository.findOne({
                comment: 'find last ended 1v1 cursor',
                relations: { gameData: true },
                where: { publicId: fromGamePublicId },
            });

            if (null === cursor) {
                throw new Error('Invalid cursor, this id does not belong to a hostedGame');
            }

            options.where = {
                ...options.where,
                publicId: Not(cursor.publicId),
                gameData: {
                    endedAt: And(
                        Not(IsNull()),
                        LessThanOrEqual(cursor.gameData!.endedAt!),
                    ),
                },
            };
        }

        const hostedGames = await this.hostedGameRepository.find(options);

        return hostedGames;
    }

    async findLastEndedByPlayer(player: Player, fromGamePublicId?: string): Promise<HostedGame[]>
    {
        // Query to get id of games played by given player
        const hostedGameIdsQuery = this.hostedGameRepository
            .createQueryBuilder('hostedGame')
            .select('hostedGame.id', 'id')
            .innerJoin('hostedGame.gameData', 'gameData')
            .innerJoin('hostedGame.hostedGameToPlayers', 'hostedGameToPlayer')
            .innerJoin('hostedGameToPlayer.player', 'player')
            .where('player.publicId = :publicId', { publicId: player.publicId })
            .andWhere('hostedGame.state = :ended', { ended: 'ended' })
            .orderBy('gameData.endedAt', 'DESC')
            .limit(20)
        ;

        // Alter query to take only games older than cursor
        if (undefined !== fromGamePublicId) {
            const cursor = await this.hostedGameRepository.findOne({
                relations: { gameData: true },
                where: { publicId: fromGamePublicId },
            });

            if (null === cursor) {
                throw new Error('Invalid cursor, this id does not belong to a hostedGame');
            }

            hostedGameIdsQuery
                .andWhere('gameData.endedAt <= :cursorEndedAt', { cursorEndedAt: cursor.gameData?.endedAt })
                .andWhere('hostedGame.id != :cursorId', { cursorId: cursor.id })
            ;
        }

        const hostedGameIds: { id: number }[] = await hostedGameIdsQuery.getRawMany();

        const hostedGames = await this.hostedGameRepository.find({
            relations,
            where: {
                id: In(hostedGameIds.map(row => row.id)),
            },
        });

        return hostedGames;
    }
}
