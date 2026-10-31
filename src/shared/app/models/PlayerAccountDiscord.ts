import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, type Relation } from 'typeorm';
import Player from './Player.js';

/**
 * Discord account linked to a player, allows to log in with Discord.
 * Private: only visible by the player itself, never exposed with Player.
 *
 * In its own table to keep player table light.
 */
@Entity()
export default class PlayerAccountDiscord
{
    @PrimaryColumn()
    playerId?: number;

    @OneToOne(() => Player, { onDelete: 'CASCADE' })
    @JoinColumn()
    player: Relation<Player>;

    /**
     * Discord user id (snowflake)
     */
    @Column({ length: 32, unique: true })
    discordId: string;

    /**
     * Discord username, at the time of linking.
     */
    @Column({ length: 64 })
    discordUsername: string;

    @Column({ default: () => 'current_timestamp()' })
    createdAt: Date;
}
