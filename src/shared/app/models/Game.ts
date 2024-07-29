import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import HostedGame from './HostedGame';
import type { Outcome, PlayerIndex } from '../../game-engine/Types';
import { Expose, plainToInstance } from '../class-transformer-custom';
import { Type } from 'class-transformer';
import Move from './Move';

@Entity()
export default class Game
{
    @PrimaryColumn()
    hostedGameId?: number;

    @OneToOne(() => HostedGame)
    @JoinColumn()
    hostedGame?: HostedGame;

    @Column('smallint')
    @Expose()
    size: number;

    @Column({ type: 'json', transformer: { from: (value: null | unknown) => deserializeMovesHistory(value), to: value => value } })
    @Expose()
    @Type(() => Move)
    movesHistory: Move[];

    @Column()
    @Expose()
    allowSwap: boolean;

    @Column({ type: 'smallint' })
    @Expose()
    currentPlayerIndex: PlayerIndex;

    @Column({ type: 'smallint', nullable: true })
    @Expose()
    winner: null | PlayerIndex = null;

    @Column({ type: String, length: 15, nullable: true })
    @Expose()
    outcome: Outcome = null;

    @Column({ type: Date, default: () => 'current_timestamp(3)', precision: 3 })
    @Expose()
    @Type(() => Date)
    startedAt: Date = new Date();

    @Column({ type: Date, precision: 3, nullable: true })
    @Expose()
    @Type(() => Date)
    lastMoveAt: null | Date = null;

    @Column({ type: Date, precision: 3, nullable: true })
    @Index()
    @Expose()
    @Type(() => Date)
    endedAt: null | Date = null;
}

const deserializeMovesHistory = (value: null | unknown): Move[] => {
    if (null === value) {
        return [];
    }

    if (!(value instanceof Array)) {
        throw new Error('Expected an array here');
    }

    return value.map(v => plainToInstance(Move, v));
};
