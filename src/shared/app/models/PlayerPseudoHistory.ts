import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import Player from './Player.js';

/**
 * A pseudo previously used by a player, and the period it was used.
 * Used to display former pseudo on profile page, limit pseudo changes,
 * and redirect old profile urls.
 */
@Entity()
export default class PlayerPseudoHistory
{
    @PrimaryGeneratedColumn()
    id?: number;

    @Index()
    @Column()
    playerId: number;

    @ManyToOne(() => Player, { nullable: false, onDelete: 'CASCADE' })
    player: Relation<Player>;

    @Column({ length: 34 })
    pseudo: string;

    /**
     * Not unique: an old slug can be reused by another player.
     */
    @Index()
    @Column({ length: 34 })
    slug: string;

    @Column()
    startedAt: Date;

    @Column()
    endedAt: Date;
}
