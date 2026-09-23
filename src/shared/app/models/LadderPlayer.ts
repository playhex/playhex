import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, type Relation, Unique } from 'typeorm';
import { Type } from 'class-transformer';
import { Expose } from '../class-transformer-custom.js';
import Player from './Player.js';
import Ladder from './Ladder.js';
import type { LadderPlayerState, LadderRulesPlayer } from '../ladder/ladderRules.js';

/**
 * Membership of a player in a ladder.
 * Kept when player leaves or is removed, to keep streaks, titles, and rejoin delay.
 */
@Entity()
@Unique(['ladderId', 'playerId'])
export default class LadderPlayer implements LadderRulesPlayer
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

    @Column({ type: String, length: 16 })
    @Expose()
    state: LadderPlayerState;

    /**
     * Seat in the ladder, 1 is the King.
     * null when not active.
     */
    @Column({ type: 'int', nullable: true })
    @Expose()
    position: null | number;

    /**
     * Seat held when player left or was removed.
     * A challenger beating them after they left still takes this seat.
     */
    @Column({ type: 'int', nullable: true })
    @Expose()
    leftPosition: null | number;

    /**
     * Incoming slots chosen by player.
     */
    @Column({ type: 'smallint' })
    @Expose()
    incomingSlots: number;

    @Column({ type: 'int', default: 0 })
    @Expose()
    currentDefenseStreak: number;

    @Column({ type: 'int', default: 0 })
    @Expose()
    bestDefenseStreak: number;

    @Column({ type: 'int', default: 0 })
    @Expose()
    consecutiveChallengeWins: number;

    @Column({ type: 'int', default: 0 })
    @Expose()
    giantSlayerCount: number;

    @Column({ type: 'int', default: 0 })
    @Expose()
    climberCount: number;

    @Column()
    @Expose()
    @Type(() => Date)
    joinedAt: Date;

    @Column({ type: Date, nullable: true })
    @Expose()
    @Type(() => Date)
    leftAt: null | Date;

    @Column({ type: Date, nullable: true })
    @Expose()
    @Type(() => Date)
    rejoinableAt: null | Date;

    @Column({ type: Date, nullable: true })
    @Expose()
    @Type(() => Date)
    lastGameEndedAt: null | Date;
}
