import { Column, Entity, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import Player from './Player.js';
import Tournament from './Tournament.js';
import type TournamentType from './Tournament.js';
import { Expose } from '../class-transformer-custom.js';

/**
 * Players subscriptions to tournaments before tournament starts.
 * List of players that subscribed to tournament.
 * They will receive a notification to check-in before the tournament.
 */
@Entity()
export default class TournamentSubscription
{
    @PrimaryColumn()
    tournamentId: number;

    @ManyToOne(() => Tournament, tournament => tournament.subscriptions)
    tournament: TournamentType;

    @PrimaryColumn()
    playerId: number;

    @ManyToOne(() => Player)
    @Expose()
    player: Relation<Player>;

    /**
     * Player has checked in,
     * he will participate to matches when tournament starts.
     */
    @Column({ type: Date, nullable: true })
    @Expose()
    checkedIn: null | Date;

    @Column({ type: Date })
    @Expose()
    subscribedAt: Date;
}
