import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { keysOf } from '../utils.js';
import Puzzle from './Puzzle.js';
import { PUZZLE_MONITOR_LINE_MAX_LENGTH } from './PuzzleMonitorUncoveredLine.js';

/**
 * Uncovered line marked as false positive by puzzle author: hidden by default, see PuzzleMonitorUncoveredLine.
 * Still logged, to check later whether it was actually a serious line to cover.
 */
@Entity()
@Index(keysOf<PuzzleMonitorUncoveredLineIgnored>()('puzzle', 'line'), { unique: true })
export default class PuzzleMonitorUncoveredLineIgnored
{
    @PrimaryGeneratedColumn()
    id?: number;

    @ManyToOne(() => Puzzle, { nullable: false, onDelete: 'CASCADE' })
    puzzle: Relation<Puzzle>;

    @Column({ type: String, length: PUZZLE_MONITOR_LINE_MAX_LENGTH })
    line: string;

    @Column({ type: Date, default: () => 'current_timestamp()' })
    createdAt?: Date;
}
