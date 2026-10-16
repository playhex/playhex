import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import Player from './Player.js';
import Puzzle from './Puzzle.js';
import type { TrainingType } from '../training/trainingLevels.js';

/**
 * A puzzle played in a training section, e.g "Defend your template".
 * Dated history of player results, TrainingProgress is derived from it.
 */
@Entity()
@Index(['playerId', 'trainingType', 'createdAt'])
export default class TrainingAttempt
{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: String, length: 32 })
    trainingType: TrainingType;

    @Column()
    playerId: number;

    @ManyToOne(() => Player, { nullable: false })
    player: Relation<Player>;

    @Column()
    puzzleId: number;

    @ManyToOne(() => Puzzle, { nullable: false, onDelete: 'CASCADE' })
    puzzle: Relation<Puzzle>;

    /**
     * One entry per line (intrusion), true if solved first try, without wrong move nor hint.
     */
    @Column({ type: 'json' })
    lines: boolean[];

    @Column({ default: false })
    hintUsed: boolean;

    @Column({ default: false })
    gaveUp: boolean;

    /**
     * Whether played in a training session, or practiced alone.
     */
    @Column({ default: false })
    inSession: boolean;

    @Column({ type: Date, default: () => 'current_timestamp()' })
    createdAt: Date;
}
