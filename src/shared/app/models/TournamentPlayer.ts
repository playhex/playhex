import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import Player from './Player.js';
import Tournament from './Tournament.js';

/**
 * Players relations to tournaments before tournament starts.
 */
@Entity()
export default class TournamentPlayer
{
    @PrimaryColumn()
    tournamentId: number;

    @ManyToOne(() => Tournament)
    tournament: Tournament;

    @PrimaryColumn()
    playerId: number;

    @ManyToOne(() => Player)
    player: Player;

    /**
     * Player is only interested in the tournament,
     * and want to receive notifications about checkin and tournament
     */
    @Column()
    interested: boolean;

    /**
     * Player want to participate.
     * He still have to check-in
     */
    @Column()
    participating: boolean;

    /**
     * Player has checked in,
     * he will participate to matches when tournament starts.
     */
    @Column()
    checkedId: boolean;
}
