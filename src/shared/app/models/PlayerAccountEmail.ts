import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, type Relation } from 'typeorm';
import Player from './Player.js';

/**
 * Optional email set by a player in its account settings.
 * Only visible by the player itself, never exposed with Player.
 * Not verified. No email is sent automatically for now.
 *
 * In its own table to keep player table light.
 */
@Entity()
export default class PlayerAccountEmail
{
    @PrimaryColumn()
    playerId?: number;

    @OneToOne(() => Player, { onDelete: 'CASCADE' })
    @JoinColumn()
    player: Relation<Player>;

    @Column({ length: 254 })
    email: string;

    @Column({ default: () => 'current_timestamp()' })
    createdAt: Date;

    @Column({ default: () => 'current_timestamp()' })
    updatedAt: Date;
}
