import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Type } from 'class-transformer';
import { Expose } from '../class-transformer-custom.js';
import { ColumnUUID } from '../custom-typeorm.js';
import { keysOf } from '../utils.js';
import Player from './Player.js';

export type ExternalGameImportJobStatus = 'pending' | 'running' | 'done' | 'failed';

export type ExternalGameImportSource = 'LG';

/**
 * A player requested to import all games of an account on an external site.
 * Processed in background, one at a time, by ExternalGameImportWorker.
 */
@Entity()
@Index(keysOf<ExternalGameImportJob>()('status', 'createdAt'))
export default class ExternalGameImportJob
{
    @PrimaryGeneratedColumn()
    id?: number;

    @ColumnUUID({ unique: true })
    @Expose()
    publicId: string;

    @ManyToOne(() => Player, { nullable: false, onDelete: 'CASCADE' })
    requestedBy: Relation<Player>;

    @Column({ length: 15 })
    @Expose()
    source: ExternalGameImportSource;

    /**
     * Id of the player on source, e.g Little Golem plid "2883".
     */
    @Column({ length: 64 })
    @Expose()
    externalPlayerId: string;

    @Column({ type: String, length: 15 })
    @Expose()
    status: ExternalGameImportJobStatus = 'pending';

    /**
     * Number of games found on source. Null until listed.
     */
    @Column({ type: 'int', nullable: true })
    @Expose()
    totalGames: null | number = null;

    @Column({ type: 'int', default: 0 })
    @Expose()
    importedGames: number = 0;

    /**
     * Games already imported before.
     */
    @Column({ type: 'int', default: 0 })
    @Expose()
    skippedGames: number = 0;

    @Column({ type: 'int', default: 0 })
    @Expose()
    failedGames: number = 0;

    /**
     * Games still in progress on source, not imported, will be on a next import.
     */
    @Column({ type: 'int', default: 0 })
    @Expose()
    notFinishedGames: number = 0;

    @Column({ type: String, length: 255, nullable: true })
    @Expose()
    lastError: null | string = null;

    @Column({ type: Date, precision: 3, default: () => 'current_timestamp(3)' })
    @Expose()
    @Type(() => Date)
    createdAt: Date = new Date();

    @Column({ type: Date, precision: 3, nullable: true })
    @Expose()
    @Type(() => Date)
    startedAt: null | Date = null;

    @Column({ type: Date, precision: 3, nullable: true })
    @Expose()
    @Type(() => Date)
    endedAt: null | Date = null;
}
