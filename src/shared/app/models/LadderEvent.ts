import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Type } from 'class-transformer';
import { Expose } from '../class-transformer-custom.js';
import Player from './Player.js';
import Ladder from './Ladder.js';
import LadderChallenge from './LadderChallenge.js';
import type { LadderEventType } from '../ladder/ladderRules.js';

/**
 * Ladder history: joins, results, new Kings, titles, strikes...
 */
@Entity()
@Index(['ladderId', 'createdAt'])
export default class LadderEvent
{
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    ladderId: number;

    @ManyToOne(() => Ladder, { nullable: false })
    ladder: Relation<Ladder>;

    @Column({ type: String, length: 32 })
    @Expose()
    type: LadderEventType;

    /**
     * Main player of this event
     */
    @ManyToOne(() => Player, { nullable: false })
    @Expose()
    @Type(() => Player)
    player: Relation<Player>;

    /**
     * Opponent, dethroned King...
     */
    @ManyToOne(() => Player, { nullable: true })
    @Expose()
    @Type(() => Player)
    otherPlayer: null | Relation<Player> = null;

    @ManyToOne(() => LadderChallenge, { nullable: true })
    @Expose()
    @Type(() => LadderChallenge)
    challenge: null | Relation<LadderChallenge> = null;

    /**
     * Event details: positions, strikes count...
     */
    @Column({ type: 'json' })
    @Expose()
    parameters: { [key: string]: null | string | number | boolean } = {};

    @Column()
    @Expose()
    @Type(() => Date)
    createdAt: Date;
}
