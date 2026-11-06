import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Type } from 'class-transformer';
import { Expose, GROUP_DEFAULT } from '../class-transformer-custom.js';
import { ColumnUUID } from '../custom-typeorm.js';
import { HEXPLORER_STUDY_TITLE_MAX_LENGTH, type HexplorerState } from '../hexplorerStudy.js';
import Player from './Player.js';

/**
 * A whole Hexplorer analysis saved on server: tree, marks, comments and settings.
 * Accessible by anyone having its link, only its author can update it,
 * and anyone can fork it.
 */
@Entity()
export default class HexplorerStudy
{
    @PrimaryGeneratedColumn()
    id: number;

    @ColumnUUID({ unique: true })
    @Expose({ groups: [GROUP_DEFAULT, 'hexplorer_study'] })
    publicId: string;

    @Column({ type: String, length: HEXPLORER_STUDY_TITLE_MAX_LENGTH, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'hexplorer_study'] })
    title: null | string;

    @Column({ type: 'json' })
    @Expose({ groups: [GROUP_DEFAULT, 'hexplorer_study'] })
    data: HexplorerState;

    /**
     * Only player allowed to update this study.
     */
    @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL' })
    @Expose({ groups: [GROUP_DEFAULT, 'hexplorer_study'] })
    @Type(() => Player)
    author: null | Relation<Player>;

    /**
     * Study this one has been forked from. Null if not a fork, or if initial study has been deleted.
     */
    @ManyToOne(() => HexplorerStudy, { nullable: true, onDelete: 'SET NULL' })
    @Expose({ groups: [GROUP_DEFAULT, 'hexplorer_study'] })
    @Type(() => HexplorerStudy)
    forkedFrom: null | Relation<HexplorerStudy>;

    /**
     * Moves and setups in tree, without root. Only set when listing studies, which do not load data.
     */
    @Expose({ groups: [GROUP_DEFAULT, 'hexplorer_study'] })
    nodesCount?: number;

    @Column({ type: Date, default: () => 'current_timestamp()' })
    @Expose({ groups: [GROUP_DEFAULT, 'hexplorer_study'] })
    @Type(() => Date)
    createdAt: Date;

    @Column({ type: Date, default: () => 'current_timestamp()' })
    @Expose({ groups: [GROUP_DEFAULT, 'hexplorer_study'] })
    @Type(() => Date)
    updatedAt: Date;
}
