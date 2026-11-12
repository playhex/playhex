import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { IsIn, IsNotEmpty, IsOptional } from 'class-validator';
import Game from './Game.js';
import { Expose, GROUP_DEFAULT } from '../class-transformer-custom.js';
import AbstractChatMessage from './AbstractChatMessage.js';
import { type ChatMessageVisibility, chatMessageVisibilities } from '../chatMessageVisibility.js';

/**
 * Chat message posted in a game.
 */
@Entity()
export default class ChatMessage extends AbstractChatMessage
{
    @IsNotEmpty()
    @Column()
    gameId: number;

    @ManyToOne(() => Game, game => game.chatMessages)
    @JoinColumn()
    @Expose({ groups: ['player_moderation_action'] })
    game: Relation<Game>;

    /**
     * Who can see this message.
     * Use isChatMessageVisibleToEveryone() before sending it to anyone else than its author.
     */
    @IsOptional({ groups: ['playerInput'] })
    @IsIn(chatMessageVisibilities, { groups: ['playerInput', 'post'] })
    @Column({ type: String, length: 16, default: 'public' })
    @Expose({ groups: [GROUP_DEFAULT, 'player_moderation_action', 'moderation'] })
    visibility: ChatMessageVisibility = 'public';
}
