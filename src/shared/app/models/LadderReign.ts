import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Type } from 'class-transformer';
import { Expose } from '../class-transformer-custom.js';
import Player from './Player.js';
import Ladder from './Ladder.js';

/**
 * A King reign: from taking seat 1 to losing it.
 * Used for the reign counter and the Hall of Fame.
 */
@Entity()
export default class LadderReign
{
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    ladderId: number;

    @ManyToOne(() => Ladder, { nullable: false })
    ladder: Relation<Ladder>;

    @Column()
    playerId: number;

    @ManyToOne(() => Player, { nullable: false })
    @Expose()
    @Type(() => Player)
    player: Relation<Player>;

    @Column()
    @Expose()
    @Type(() => Date)
    startedAt: Date;

    /**
     * null for the current King
     */
    @Column({ type: Date, nullable: true })
    @Expose()
    @Type(() => Date)
    endedAt: null | Date = null;

    /**
     * Successful defenses during this reign
     */
    @Column({ type: 'int', default: 0 })
    @Expose()
    defenses: number = 0;
}
