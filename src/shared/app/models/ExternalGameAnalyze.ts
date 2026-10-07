import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, type Relation } from 'typeorm';
import { Expose } from '../class-transformer-custom.js';
import ExternalGame from './ExternalGame.js';
import type { GameAnalyzeData } from './GameAnalyze.js';

/**
 * Same as GameAnalyze, but for external games.
 * Can be used everywhere a GameAnalyze is expected (same exposed fields).
 */
@Entity()
export default class ExternalGameAnalyze
{
    @PrimaryColumn()
    externalGameId: number;

    @OneToOne(() => ExternalGame, { onDelete: 'CASCADE' })
    @JoinColumn()
    externalGame: Relation<ExternalGame>;

    /**
     * If null but endedAt is not,
     * then the analyze errored.
     */
    @Expose()
    @Column({ type: 'json', nullable: true })
    analyze: null | GameAnalyzeData = null;

    @Expose()
    @Column({ type: Date, precision: 3, default: () => 'current_timestamp(3)' })
    startedAt: Date = new Date();

    /**
     * If null, analyze is still processing.
     */
    @Expose()
    @Column({ type: Date, precision: 3, nullable: true })
    endedAt: null | Date = null;
}
