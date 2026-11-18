import { Column, Entity, Index, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import Player from './Player.js';
import { keysOf } from '../utils.js';
import type { PlayerRetrospectiveData } from '../retrospective/retrospectiveTypes.js';

/**
 * Yearly retrospective of a player, computed by "retro:generate" command.
 * Not exposed as is: only data is returned by api.
 *
 * Indexed columns are used to compute "top X%" among players of the same year.
 */
@Entity()
@Index(keysOf<PlayerRetrospective>()('year', 'hidden'))
export default class PlayerRetrospective
{
    @PrimaryColumn()
    playerId: number;

    @ManyToOne(() => Player, { nullable: false, onDelete: 'CASCADE' })
    player?: Relation<Player>;

    @PrimaryColumn({ type: 'smallint' })
    year: number;

    @Column({ type: 'json' })
    data: PlayerRetrospectiveData;

    /**
     * Random code required in url, so that a retrospective is only visible when shared by its player.
     * Kept when retrospective is recomputed. Never exposed, except to the player.
     */
    @Column({ type: 'varchar', length: 5 })
    shareCode: string;

    /**
     * Player not eligible this year (see isRetrospectiveEligible()),
     * i.e snapshot computed only to compare with next year retrospective.
     * Never listed nor displayed.
     */
    @Column({ default: false })
    hidden: boolean = false;

    /**
     * Set once percentiles, progress and challenges are computed (2nd pass of command).
     * Retrospective is not displayed until then.
     */
    @Column({ type: Date, nullable: true })
    publishedAt: null | Date = null;

    @Column()
    computedAt: Date;

    /*
     * Values used to compute "top X%"
     */

    @Column({ type: 'int', default: 0 })
    games1v1: number = 0;

    @Column({ type: 'int', default: 0 })
    livePlaySeconds: number = 0;

    @Column({ type: 'smallint', default: 0 })
    activeDays: number = 0;

    @Column({ type: 'int', default: 0 })
    chatMessages: number = 0;

    @Column({ type: 'int', default: 0 })
    rankedWins: number = 0;

    /**
     * Overall rating at end of year, only if confident. Also in data.rating.
     */
    @Column({ type: 'float', nullable: true })
    endRating: null | number = null;

    /**
     * Current rating (at generation time) of strongest opponent beaten in a ranked game. Never exposed.
     */
    @Column({ type: 'float', nullable: true })
    strongestOpponentBeatenRating: null | number = null;

    /**
     * Rating of strongest bot beaten, to suggest next bot to beat. Never exposed.
     */
    @Column({ type: 'float', nullable: true })
    strongestBotBeatenRating: null | number = null;
}
