import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Get, JsonController, NotFoundError, Post, QueryParam } from 'routing-controllers';
import { AuthenticatedPlayer } from '../middlewares.js';
import { Player, PlayerNotification, Game } from '../../../../shared/app/models/index.js';
import { UNREAD_PLAYER_NOTIFICATIONS_LIMIT } from '../../../../shared/app/playerNotificationUtils.js';

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

        return this.createNotificationsQueryBuilder(player.id)
            .andWhere('playerNotification.isRead = false')
            .take(UNREAD_PLAYER_NOTIFICATIONS_LIMIT)
            .getMany()
        ;
    }

    /**
     * Get already read notifications, most recent first.
     * Use "before" (publicId of the last notification already loaded) to paginate.
     */
    @Get('/api/player-notifications/read')
    async getRead(
        @AuthenticatedPlayer() player: Player,
        @QueryParam('before') before?: string,
        @QueryParam('limit') limit?: number,
    ) {
        if (!player.id) {
            throw new Error('Unexpected no player id');
        }

        const queryBuilder = this.createNotificationsQueryBuilder(player.id)
            .andWhere('playerNotification.isRead = true')
            .take(Math.max(1, Math.min(limit ?? 20, 20)))
        ;

        if (before) {
            const cursor = await this.playerNotificationRepository.findOne({
                where: { publicId: before, playerId: player.id },
                select: { id: true, createdAt: true },
            });

            if (!cursor) {
                throw new NotFoundError(`No notification with public id "${before}"`);
            }

            queryBuilder.andWhere(
                '(playerNotification.createdAt < :cursorCreatedAt OR (playerNotification.createdAt = :cursorCreatedAt AND playerNotification.id < :cursorId))',
                { cursorCreatedAt: cursor.createdAt, cursorId: cursor.id },
            );
        }

        return queryBuilder.getMany();
    }

    private createNotificationsQueryBuilder(playerId: number)
    {
        return this.playerNotificationRepository.createQueryBuilder('playerNotification')
            .where('playerNotification.playerId = :playerId', { playerId })
            .leftJoin('playerNotification.game', 'game')
            .addSelect(['game.id', 'game.publicId', 'game.createdAt'])
            .leftJoin('game.gameToPlayers', 'gameToPlayers')
            .addSelect(['gameToPlayers.gameId', 'gameToPlayers.playerId', 'gameToPlayers.order'])
            .leftJoin('gameToPlayers.player', 'gameToPlayerPlayer')
            .addSelect(['gameToPlayerPlayer.id', 'gameToPlayerPlayer.publicId', 'gameToPlayerPlayer.pseudo', 'gameToPlayerPlayer.slug', 'gameToPlayerPlayer.isGuest', 'gameToPlayerPlayer.isBot'])
            .orderBy('playerNotification.createdAt', 'DESC')
            .addOrderBy('playerNotification.id', 'DESC')
        ;
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
