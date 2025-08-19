import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { IsIn } from 'class-validator';
import Tournament from './Tournament.js';
import { Expose } from '../class-transformer-custom.js';

export const historyTypes = [
    'created',
    'edited',
    'player_subscribed',
    'player_unsubscribed',
    'player_checked_in',
    'player_kicked',
    'player_banned',
    'changed_admins',
    'started',
    'match_canceled_recreated',
    'match_ended',
    'ended',
] as const;

export type HistoryType = typeof historyTypes[number];

@Entity()
export default class TournamentHistory
{
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Tournament, tournament => tournament.history, { nullable: false })
    tournament: Relation<Tournament>;

    @Column({ type: String })
    @Expose()
    @IsIn(historyTypes, { each: true })
    type: HistoryType;

    @Column({ type: 'json' })
    @Expose()
    parameters: object;

    @Column()
    @Expose()
    date: Date;
}

export const addTournamentHistory = (tournament: Tournament, type: HistoryType, parameters: object = {}, date: Date = new Date): TournamentHistory => {
    const tournamentHistory = new TournamentHistory();

    tournamentHistory.tournament = tournament;
    tournamentHistory.type = type;
    tournamentHistory.parameters = parameters;
    tournamentHistory.date = date;

    tournament.history.push(tournamentHistory);

    return tournamentHistory;
};
