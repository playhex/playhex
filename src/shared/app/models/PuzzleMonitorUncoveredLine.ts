import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { keysOf } from '../utils.js';
import Player from './Player.js';
import Puzzle from './Puzzle.js';

/**
 * Max length of a stored line, e.g "a1 b2 c3".
 */
export const PUZZLE_MONITOR_LINE_MAX_LENGTH = 512;

/**
 * Puzzle monitoring: a player played a move not covered by puzzle tree, which failed the puzzle.
 * Logged once per puzzle, line and player, to show author which lines players try.
 */
@Entity()
@Index(keysOf<PuzzleMonitorUncoveredLine>()('puzzle', 'line', 'player'), { unique: true })
export default class PuzzleMonitorUncoveredLine
{
    @PrimaryGeneratedColumn()
    id?: number;

    @ManyToOne(() => Puzzle, { nullable: false, onDelete: 'CASCADE' })
    puzzle: Relation<Puzzle>;

    @ManyToOne(() => Player, { nullable: false, onDelete: 'CASCADE' })
    player: Relation<Player>;

    /**
     * Moves played from initial position, computer moves included,
     * last one is the uncovered move, e.g "a1 b2 c3".
     */
    @Column({ type: String, length: PUZZLE_MONITOR_LINE_MAX_LENGTH })
    line: string;

    @Column({ type: Date, default: () => 'current_timestamp()' })
    createdAt?: Date;
}
