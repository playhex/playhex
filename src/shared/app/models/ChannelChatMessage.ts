import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { Expose } from '../class-transformer-custom.js';
import AbstractChatMessage from './AbstractChatMessage.js';
import Channel from './Channel.js';

/**
 * Chat message posted in a Channel.
 */
@Entity()
export default class ChannelChatMessage extends AbstractChatMessage
{
    @IsNotEmpty()
    @Column()
    channelId: number;

    @ManyToOne(() => Channel, channel => channel.messages)
    @JoinColumn()
    @Expose({ groups: ['player_moderation_action'] })
    channel: Relation<Channel>;
}
