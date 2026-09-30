import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation, Unique } from 'typeorm';
import Player from './Player.js';
import { Expose } from '../class-transformer-custom.js';

/**
 * Api key given to a player to let him run AI workers
 * and contribute to AI computations (bot moves, game analyzes...).
 */
@Entity()
@Unique(['player', 'name'])
export default class PlayerAiWorkerKey
{
    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    playerId: number;

    @ManyToOne(() => Player)
    player: Relation<Player>;

    /**
     * Name of the key, to distinguish keys of a same player. "default" by default.
     */
    @Expose()
    @Column({ type: String, length: 64 })
    name: string;

    /**
     * Random a-zA-Z0-9 string, sent by worker in Authorization header.
     */
    @Expose()
    @Column({ type: 'char', length: 32 })
    @Index({ unique: true })
    key: string;

    @Expose()
    @Column({ default: true })
    enabled: boolean;

    @Expose()
    @Column({ type: Date, precision: 3, default: () => 'current_timestamp(3)' })
    createdAt: Date = new Date();

    @Expose()
    @Column({ type: Date, precision: 3, nullable: true })
    revokedAt: null | Date = null;

    /**
     * Last time a worker used this key.
     */
    @Expose()
    @Column({ type: Date, precision: 3, nullable: true })
    lastSeenAt: null | Date = null;
}
