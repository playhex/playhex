import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import Game from './Game.js';
import { Expose } from '../class-transformer-custom.js';
import AbstractChatMessage from './AbstractChatMessage.js';

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
}
