import { HostedGame, Player } from '../../shared/app/models';
import { Inject, Service } from 'typedi';
import logger from '../services/logger';
import { EntityRepository, FilterQuery, wrap } from '@mikro-orm/core';
import { orm } from '../data-source';

/**
 * Relations to load in order to recreate an HostedGame in memory.
 */
const relations = {
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
        @Inject('EntityRepository<HostedGame>')
        private hostedGameRepository: EntityRepository<HostedGame>,
    ) {}

    async persist(hostedGame: HostedGame): Promise<void>
    {
        logger.info('Persisting a game...', { publicId: hostedGame.publicId });



        // console.log('HERE');
        // const testEm = orm.em.fork();
        // const hg = await testEm.findOne(HostedGame, 1, {
        //     populate: ['gameData'],
        // });
        // if (null === hg) throw new Error('arg');
        // hg.gameData!.size = 42;
        // await testEm.flush();
        // console.log('HERE DONE');

        orm.em.persist(hostedGame);
        await orm.em.flush();

        logger.info('Persisting done', { publicId: hostedGame.publicId, id: hostedGame.id });
    }

    async persistLinkToRematch(hostedGame: HostedGame): Promise<void>
    {
        await orm.em.persistAndFlush(hostedGame);
    }

    async deleteIfExists(hostedGame: HostedGame): Promise<void>
    {
        logger.info('Delete a game if exists...', { publicId: hostedGame.publicId });

        await this.hostedGameRepository.nativeDelete({
            id: hostedGame.id,
        });

        logger.info('Deleted.', { publicId: hostedGame.publicId, hostedGame });
    }

    async findUnique(publicId: string): Promise<null | HostedGame>
    {
        return await this.hostedGameRepository.findOne({
            publicId,
            ratings: { $or: [
                { category: 'overall' },
                { category: null },
            ] },
        }, {
            populate: [
                'chatMessages.player',
                'rematch',
                'rematchedFrom',
                'gameData',
                'gameOptions',
                'host.currentRating',
                'hostedGameToPlayers.player.currentRating',
            ],
        });
    }

    async findRematch(rematchedFromId: number): Promise<null | HostedGame>
    {
        return await this.hostedGameRepository.findOne({
            rematchedFrom: {
                id: rematchedFromId,
            },
        }, {
            populate: [
                'chatMessages.player',
                'rematch',
                'rematchedFrom',
                'gameData',
                'gameOptions',
                'host.currentRating',
                'hostedGameToPlayers.player.currentRating',
            ],
        });
    }

    async findMany(criteria?: FilterQuery<HostedGame>): Promise<HostedGame[]>
    {
        return await this.hostedGameRepository.find(criteria || {}, {
            populate: [
                'chatMessages.player',
                'rematch',
                'rematchedFrom',
                'gameData',
                'gameOptions',
                'host.currentRating',
                'hostedGameToPlayers.player.currentRating',
            ],
        });
    }

    async findLastEnded1v1(take = 5, fromGamePublicId?: string): Promise<HostedGame[]>
    {
        const cursor = await this.hostedGameRepository.findByCursor({
            state: 'ended',
            gameOptions: {
                opponentType: 'player',
            },
            ratings: { $or: [
                { category: 'overall' },
                { category: null },
            ] },
        }, {
            first: take,
            after: fromGamePublicId && {
                publicId: fromGamePublicId,
            },
            populate: [
                'gameData',
                'gameOptions',
                'host',
                'hostedGameToPlayers.player.currentRating',
            ],
            orderBy: {
                gameData: {
                    endedAt: 'desc',
                },
            },
        });

        return cursor.items;
    }

    async findLastEndedByPlayer(player: Player, fromGamePublicId?: string): Promise<HostedGame[]>
    {
        const cursor = await this.hostedGameRepository.findByCursor({
            state: 'ended',
            hostedGameToPlayers: {
                player: {
                    publicId: player.publicId,
                },
            },
            ratings: { $or: [
                { category: 'overall' },
                { category: null },
            ] },
        }, {
            first: 20,
            after: fromGamePublicId && {
                publicId: fromGamePublicId,
            },
            populate: [
                'gameData',
                'gameOptions',
                'host',
                'hostedGameToPlayers.player.currentRating',
            ],
            orderBy: {
                gameData: {
                    endedAt: 'desc',
                },
            },
        });

        return cursor.items;
    }
}
