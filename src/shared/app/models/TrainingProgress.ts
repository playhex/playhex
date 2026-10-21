import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, type Relation, Unique } from 'typeorm';
import Player from './Player.js';
import Puzzle from './Puzzle.js';
import type { TrainingType } from '../training/trainingLevels.js';
import type { TrainingProgressData } from '../training/trainingRules.js';

/**
 * Progress of a player on a puzzle of a training section.
 * Derived from TrainingAttempt, see applyAttempt().
 */
@Entity()
@Unique(['playerId', 'trainingType', 'puzzleId'])
export default class TrainingProgress implements TrainingProgressData
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

    @Column({ type: 'smallint' })
    box: number;

    @Column({ type: 'smallint' })
    lapses: number;

    @Column({ type: 'int' })
    attemptsCount: number;

    @Column()
    lastAttemptAt: Date;

    @Column()
    nextReviewAt: Date;
}
