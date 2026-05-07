import { Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { ColumnUUID } from '../custom-typeorm.js';
import { Expose, Type } from 'class-transformer';
import Player from './Player.js';
import ChatMessage from './ChatMessage.js';
import { GROUP_DEFAULT } from '../class-transformer-custom.js';

/**
 * This player received a moderation warning
 * or have some permission disabled (like chat blocked).
 */
@Entity()
export default class PlayerModerationAction
{
    @PrimaryGeneratedColumn()
    id?: number;

    @ColumnUUID({ unique: true })
    @Expose({ groups: [GROUP_DEFAULT, 'moderation_action_unacked'] })
    publicId: string;

    /**
     * Player who have been moderated.
     */
    @ManyToOne(() => Player)
    @Expose()
    player: Relation<Player>;

    /**
     * **Translation key**: will be translated to the player's locale.
     * Main reason of this action.
     */
    @Column({ type: String, length: 64, nullable: true })
    @Type(() => String)
    @Expose({ groups: [GROUP_DEFAULT, 'moderation_action_unacked'] })
    reason: null | string;

    /**
     * Shown to the player, as a complement to "reason".
     * Free field to add some precision to the moderation action.
     */
    @Column({ type: String, length: 255, nullable: true })
    @Type(() => String)
    @Expose({ groups: [GROUP_DEFAULT, 'moderation_action_unacked'] })
    reasonDetails: null | string;

    /**
     * If defined, player cannot use any chat until this date.
     * Else, it will be just a warning.
     */
    @Column({ type: Date, nullable: true })
    @Type(() => Date)
    @Expose({ groups: [GROUP_DEFAULT, 'moderation_action_unacked'] })
    chatBlockedUntil: null | Date;

    /**
     * Player has view this action and clicked "ok"
     */
    @Column({ type: Date, nullable: true })
    @Type(() => Date)
    @Expose()
    acknowledgedAt: null | Date;

    /**
     * Player has view this action and clicked "ok"
     */
    @Column()
    @Expose({ groups: [GROUP_DEFAULT, 'moderation_action_unacked'] })
    createdAt: Date;

    /**
     * Chat messages that originated this action.
     * Will be displayed to player as a proof.
     */
    @ManyToMany(() => ChatMessage)
    @JoinTable({ name: 'player_moderation_action_chat_message' })
    @Expose({ groups: [GROUP_DEFAULT, 'moderation_action_unacked'] })
    relatedChatMessages: ChatMessage[];
}
