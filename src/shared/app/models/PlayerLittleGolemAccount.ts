import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, type Relation } from 'typeorm';
import { Expose } from '../class-transformer-custom.js';
import Player from './Player.js';

/**
 * Little Golem account linked by a player.
 * Used to show games played on Little Golem on profile page, and import them.
 * Not verified, and not unique: a Little Golem account can be claimed by many players.
 *
 * In its own table to keep player table light: few players link a Little Golem account.
 */
@Entity()
export default class PlayerLittleGolemAccount
{
    @PrimaryColumn()
    playerId?: number;

    @OneToOne(() => Player, { onDelete: 'CASCADE' })
    @JoinColumn()
    player: Relation<Player>;

    /**
     * Little Golem player id.
     */
    @Column({ type: 'int' })
    @Expose()
    plid: number;

    /**
     * Little Golem pseudo, at the time of linking.
     */
    @Column({ length: 64 })
    @Expose()
    pseudo: string;
}
