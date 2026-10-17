import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Player, Puzzle, TrainingAttempt, TrainingProgress } from '../../shared/app/models/index.js';
import { applyAttempt } from '../../shared/app/training/trainingRules.js';
import type { TrainingType } from '../../shared/app/training/trainingLevels.js';

export type AttemptInput = Pick<TrainingAttempt, 'lines' | 'hintUsed' | 'gaveUp' | 'inSession'>;

/**
 * Attempts and progress of players in a training section.
 */
@Service()
export default class TrainingRepository
{
    constructor(
        @Inject('Repository<TrainingAttempt>')
        private trainingAttemptRepository: Repository<TrainingAttempt>,

        @Inject('Repository<TrainingProgress>')
        private trainingProgressRepository: Repository<TrainingProgress>,
    ) {}

    /**
     * @returns Progresses of player, by puzzle id
     */
    async findProgresses(trainingType: TrainingType, player: Player): Promise<Map<number, TrainingProgress>>
    {
        const progresses = await this.trainingProgressRepository.findBy({
            trainingType,
            playerId: player.id,
        });

        return new Map(progresses.map(progress => [progress.puzzleId, progress]));
    }

    /**
     * @returns Lines of last attempts, most recent first
     */
    async findRecentAttemptsLines(trainingType: TrainingType, player: Player, limit: number): Promise<boolean[][]>
    {
        const attempts = await this.trainingAttemptRepository.find({
            select: { id: true, lines: true },
            where: { trainingType, playerId: player.id },
            order: { createdAt: 'desc', id: 'desc' },
            take: limit,
        });

        return attempts.map(attempt => attempt.lines);
    }

    /**
     * Saves attempt, and updates progress accordingly.
     *
     * @returns Progress before and after this attempt
     */
    async addAttempt(
        trainingType: TrainingType,
        player: Player,
        puzzle: Puzzle,
        input: AttemptInput,
        now: Date = new Date(),
    ): Promise<{ previous: null | TrainingProgress, progress: TrainingProgress }> {
        return await this.trainingAttemptRepository.manager.transaction(async manager => {
            const attempt = manager.create(TrainingAttempt, {
                trainingType,
                playerId: player.id,
                puzzleId: puzzle.id,
                ...input,
                createdAt: now,
            });

            await manager.save(attempt);

            const previous = await manager.findOne(TrainingProgress, {
                where: { trainingType, playerId: player.id, puzzleId: puzzle.id },
                lock: { mode: 'pessimistic_write' },
            });

            const progress = manager.create(TrainingProgress, {
                ...previous,
                trainingType,
                playerId: player.id,
                puzzleId: puzzle.id,
                ...applyAttempt(previous, input.lines, now),
            });

            await manager.save(progress);

            return { previous, progress };
        });
    }
}
