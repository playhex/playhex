import { Column, Entity, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { Expose } from '../class-transformer-custom.js';
import Player from './Player.js';
import Tournament from './Tournament.js';
import type TournamentType from './Tournament.js';

/**
 * Players who are playing, or have played in tournament
 */
@Entity()
export default class TournamentParticipant
{
    @PrimaryColumn()
    tournamentId: number;

    @ManyToOne(() => Tournament, tournament => tournament.participants)
    tournament: TournamentType;

    @PrimaryColumn()
    playerId: number;

    @Expose()
    @ManyToOne(() => Player)
    player: Relation<Player>;

    /**
     * Rank of the player base on score and tiebreak.
     * First rank is 1.
     */
    @Column({ nullable: true })
    @Expose()
    rank?: number;

    /**
     * Points earned in this tournament.
     * Depends on tournament scoring, but usually number of matches won.
     * Set by tournament engine.
     */
    @Column({ default: 0 })
    @Expose()
    score: number = 0;

    /**
     * Tiebreak score, used to sort players with same score.
     * Value depends on method used to calculate tiebreak.
     * Set by tournament engine.
     */
    @Column({ default: 0 })
    @Expose()
    tiebreak: number = 0;
}
