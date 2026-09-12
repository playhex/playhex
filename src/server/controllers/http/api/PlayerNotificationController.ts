import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Get, JsonController, NotFoundError, Post, QueryParam } from 'routing-controllers';
import { AuthenticatedPlayer } from '../middlewares.js';
import { Player, PlayerNotification, Game } from '../../../../shared/app/models/index.js';

@JsonController()
@Service()
export default class PlayerController
{
    constructor(
        @Inject('Repository<PlayerNotification>')
        private playerNotificationRepository: Repository<PlayerNotification>,

        @Inject('Repository<Game>')
        private gameRepository: Repository<Game>,
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
                game: {
                    gameToPlayers: {
                        player: true,
                    },
                },
            },
            select: {
                game: {
                    publicId: true,
                    createdAt: true,
                    gameToPlayers: true,
                },
            },
            take: 50,
        });
    }

    /**
     * Marks all player notifications as read.
     * If gamePublicId is provided,
     * only mark notifications from this game as read.
     */
    @Post('/api/player-notifications/acknowledge')
    async postAcknowledgeNotifications(
        @AuthenticatedPlayer() player: Player,
        @QueryParam('gamePublicId') gamePublicId?: string,
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

        if (gamePublicId) {
            const game = await this.gameRepository.findOne({
                where: { publicId: gamePublicId },
                select: { id: true },
            });

            if (!game) {
                throw new NotFoundError(`No game with public id "${gamePublicId}"`);
            }

            queryBuilder
                .andWhere('gameId = :gameId', { gameId: game.id })
            ;
        }

        await queryBuilder.execute();
    }
}
