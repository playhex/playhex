import { Entity, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import Player from './Player.js';
import Tournament from './Tournament.js';
import type TournamentType from './Tournament.js';
import { Expose } from '../class-transformer-custom.js';

@Entity()
export default class TournamentAdmin
{
    @PrimaryColumn()
    tournamentId: number;

    @ManyToOne(() => Tournament, tournament => tournament.admins, { orphanedRowAction: 'delete' })
    tournament: TournamentType;

    @PrimaryColumn()
    playerId: number;

    @ManyToOne(() => Player)
    @Expose()
    player: Relation<Player>;
}
