import { Entity, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import Player from './Player.js';
import Tournament from './Tournament.js';
import type TournamentType from './Tournament.js';
import { Expose } from '../class-transformer-custom.js';

/**
 * A banned player has been excluded from tournament by host,
 * and cannot join anymore, unless host unban him.
 */
@Entity()
export default class TournamentBannedPlayer
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
}
