import { Column, Entity, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import Channel from './Channel.js';
import Player from './Player.js';

/**
 * Date of the last message a player has seen in a channel.
 * Used to show a "new" line in channel chat.
 */
@Entity()
export default class ChannelChatSeen
{
    @PrimaryColumn()
    channelId: number;

    @ManyToOne(() => Channel)
    channel: Relation<Channel>;

    @PrimaryColumn()
    playerId: number;

    @ManyToOne(() => Player)
    player: Relation<Player>;

    /**
     * createdAt of the last message seen by player.
     */
    @Column({ precision: 3 })
    seenAt: Date;
}
