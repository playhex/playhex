import { Entity, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import Player from './Player.js';
import TournamentSeries from './TournamentSeries.js';
import type TournamentSeriesType from './TournamentSeries.js';
import { Expose } from '../class-transformer-custom.js';

/**
 * Admins of a tournament series.
 * Same rights as the series host: edit series, create a new instance.
 */
@Entity()
export default class TournamentSeriesAdmin
{
    @PrimaryColumn()
    tournamentSeriesId: number;

    @ManyToOne(() => TournamentSeries, tournamentSeries => tournamentSeries.admins, { orphanedRowAction: 'delete' })
    tournamentSeries: TournamentSeriesType;

    @PrimaryColumn()
    playerId: number;

    @ManyToOne(() => Player)
    @Expose()
    player: Relation<Player>;
}
