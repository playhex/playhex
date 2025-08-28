import { v4 as uuidv4 } from 'uuid';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Expose, GROUP_DEFAULT } from '../class-transformer-custom.js';
import { HostedGame, Player } from './index.js';
import { Type } from 'class-transformer';
import { ColumnUUID } from '../../app/custom-typeorm.js';

type PlayerNotificationTypes = {
    /**
     * Chat message posted in a player's game
     */
    chatMessage: {
        /**
         * Nickname of player who sent the message
         */
        player: string;

        /**
         * Preview of chat message (truncated if too long)
         */
        text: string;
    };

    /**
     * One of my games has ended
     */
    gameEnded: {
        /**
         * Whether I won
         */
        iWon: boolean;

        /**
         * Nickname of my opponent
         */
        opponent: string;
    };

    /**
     * One of my games has been canceled
     */
    gameCanceled: null;

    /**
     * Custom notification to display any text
     */
    custom: {
        text: string;
    };
};

/**
 * List of notifications of players,
 * read or unread, to display in their header.
 * Can be new chat message in their game,
 * one of their correspondence game has ended...
 */
@Entity()
export default class PlayerNotification<NotificationType extends keyof PlayerNotificationTypes = keyof PlayerNotificationTypes>
{
    @PrimaryGeneratedColumn()
    id?: number;

    /**
     * Used to identify a notification on the front
     */
    @ColumnUUID({ unique: true })
    @Expose({ groups: [GROUP_DEFAULT, 'playerNotification'] })
    publicId: string;

    @Column()
    playerId: null | number;

    @ManyToOne(() => Player)
    player: Relation<Player>;

    /**
     * If this notification comes from a game,
     * link to this game.
     * Can be used to group notifications per game.
     */
    @ManyToOne(() => HostedGame, { nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'playerNotification'] })
    hostedGame: null | Relation<HostedGame>;

    /**
     * Text of the notification.
     * Used to know how to display on the UI,
     * which text to use.
     */
    @Column({ length: 64 })
    @Expose({ groups: [GROUP_DEFAULT, 'playerNotification'] })
    type: NotificationType;

    /**
     * Parameters of the notification,
     * to customize notification displaying.
     * For example: text of the chat message, link parameters...
     */
    @Column({ type: 'json', nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'playerNotification'] })
    parameters: PlayerNotificationTypes[NotificationType];

    /**
     * Whether player read this notification,
     * and should no longer be displayed as "new"
     */
    @Column({ default: false })
    @Expose({ groups: [GROUP_DEFAULT, 'playerNotification'] })
    isRead: boolean;

    /**
     * Date of the event.
     * Or in case of doubt, use new Date().
     */
    @Column({ type: Date, default: () => 'current_timestamp()' })
    @Expose({ groups: [GROUP_DEFAULT, 'playerNotification'] })
    @Type(() => Date)
    createdAt: Date;
}

export const createPlayerNotification = <T extends keyof PlayerNotificationTypes = keyof PlayerNotificationTypes>(
    type: T,
    parameters: PlayerNotificationTypes[T],
    player: Player,
    hostedGame: HostedGame,
    createdAt = new Date(),
): PlayerNotification => {
    const playerNotification = new PlayerNotification<T>();

    playerNotification.publicId = uuidv4();
    playerNotification.player = player;
    playerNotification.hostedGame = hostedGame;
    playerNotification.type = type;
    playerNotification.parameters = parameters;
    playerNotification.createdAt = createdAt;
    playerNotification.isRead = false;

    return playerNotification;
};
