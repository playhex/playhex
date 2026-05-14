import { Column, Entity, OneToMany, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Expose, Type } from 'class-transformer';
import ChannelChatMessage from './ChannelChatMessage.js';

/**
 * A channel where players can post ChannelChatMessage.
 * Games does not have channel, see ChatMessage entity.
 * Channel are used to let players post messages elsewhere than in a game,
 * e.g in a lobby channel.
 */
@Entity()
export default class Channel
{
    @PrimaryGeneratedColumn()
    id?: number;

    /**
     * Unique name of channel, also used as id.
     * Example 'lobby'
     */
    @Column({ unique: true })
    @Expose()
    name: string;

    @OneToMany(() => ChannelChatMessage, channelChatMessage => channelChatMessage.channel, { cascade: true })
    @Expose()
    @Type(() => ChannelChatMessage)
    messages: Relation<ChannelChatMessage>[];
}
