import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import Tournament from './Tournament.js';
import { Expose } from '../class-transformer-custom.js';

export const historyTypes = [
    'created',
] as const;

@Entity()
export default class TournamentHistory
{
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Tournament, tournament => tournament.history)
    tournament: Relation<Tournament>;

    @Column()
    @Expose()
    type: string;

    @Column({ type: 'json' })
    @Expose()
    parameters: object;

    @Column()
    @Expose()
    date: Date;
}
