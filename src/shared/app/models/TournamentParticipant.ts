import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
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

    @ManyToOne(() => Tournament)
    tournament: TournamentType;

    @PrimaryColumn()
    playerId: number;

    @Expose()
    @ManyToOne(() => Player)
    player: Player;

    @Column({ nullable: true })
    @Expose()
    rank?: number;

    @Column({ nullable: true })
    @Expose()
    score?: number;
}
