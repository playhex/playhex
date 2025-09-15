import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Get, JsonController, NotFoundError, Post, QueryParam } from 'routing-controllers';
import { AuthenticatedPlayer } from '../middlewares.js';
import Player from '../../../../shared/app/models/Player.js';
import PlayerNotification from '../../../../shared/app/models/PlayerNotification.js';
import HostedGame from '../../../../shared/app/models/HostedGame.js';

@JsonController()
@Service()
export default class PlayerController
{
    constructor(
        @Inject('Repository<PlayerNotification>')
        private playerNotificationRepository: Repository<PlayerNotification>,

        @Inject('Repository<HostedGame>')
        private hostedGameRepository: Repository<HostedGame>,
    ) {}

    @Get('/api/player-notifications')
    getAll(
        @AuthenticatedPlayer() player: Player,
    ) {
        if (!player.id) {
            throw new Error('Unexpected no player id');
        }

        return this.playerNotificationRepository.find({
            where: {
                playerId: player.id,
                isRead: false,
            },
            order: {
                createdAt: 'asc', // ascendant to display chat messages and game end chronologically in notifications
            },
            relations: {
                hostedGame: {
                    hostedGameToPlayers: {
                        player: true,
                    },
                },
            },
            select: {
                hostedGame: {
                    publicId: true,
                    createdAt: true,
                    hostedGameToPlayers: true,
                },
            },
            take: 50,
        });
    }

    /**
     * Marks all player notifications as read.
     * If hostedGamePublicId is provided,
     * only mark notifications from this game as read.
     */
    @Post('/api/player-notifications/acknowledge')
    async postAcknowledgeNotifications(
        @AuthenticatedPlayer() player: Player,
        @QueryParam('hostedGamePublicId') hostedGamePublicId?: string,
    ) {
        if (!player.id) {
            throw new Error('Unexpected no player id');
        }

        const queryBuilder = this.playerNotificationRepository.createQueryBuilder('playerNotification')
            .update()
            .where('playerId = :playerId', { playerId: player.id })
            .set({
                isRead: true,
            })
        ;

        if (hostedGamePublicId) {
            const hostedGame = await this.hostedGameRepository.findOne({
                where: { publicId: hostedGamePublicId },
                select: { id: true },
            });

            if (!hostedGame) {
                throw new NotFoundError(`No hosted game with public id "${hostedGamePublicId}"`);
            }

            queryBuilder
                .andWhere('hostedGameId = :hostedGameId', { hostedGameId: hostedGame.id })
            ;
        }

        await queryBuilder.execute();
    }
}
