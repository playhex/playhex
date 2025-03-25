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
     * Player want to participate.
     * He still have to check-in
     */
    @Column()
    subscribed: boolean;

    /**
     * Player has checked in,
     * he will participate to matches when tournament starts.
     */
    @Column()
    checkedId: boolean;
}
