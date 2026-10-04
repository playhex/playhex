import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Type } from 'class-transformer';
import { Expose, GROUP_DEFAULT } from '../class-transformer-custom.js';
import { ColumnUUID } from '../custom-typeorm.js';
import Player from './Player.js';

/**
 * Ordered list of puzzles, created by a player.
 * A puzzle is in at most one collection.
 */
@Entity()
export default class PuzzleCollection
{
    @PrimaryGeneratedColumn()
    id: number;

    @ColumnUUID({ unique: true })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    publicId: string;

    @Column({ type: String, length: 64 })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    name: string;

    @Column({ type: 'text', nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    description: null | string;

    /**
     * Player who created this collection, and only one allowed to edit it.
     */
    @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL' })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    @Type(() => Player)
    author: null | Relation<Player>;

    /**
     * Puzzles count, only loaded for lists.
     * Drafts are counted only in author collections list.
     */
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    puzzlesCount?: number;

    @Column({ type: Date, default: () => 'current_timestamp()' })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    @Type(() => Date)
    createdAt: Date;

    /**
     * Updated when collection is edited, or puzzles are added, moved or removed.
     */
    @Column({ type: Date, default: () => 'current_timestamp()' })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    @Type(() => Date)
    updatedAt: Date;
}
