import { BadRequestError, Body, Get, JsonController, NotFoundError, Param, Post } from 'routing-controllers';
import { Service } from 'typedi';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsString } from 'class-validator';
import { AuthenticatedPlayer } from '../controllers/http/middlewares.js';
import { Player, Puzzle } from '../../shared/app/models/index.js';
import PuzzleRepository from '../puzzles/PuzzleRepository.js';
import TrainingRepository from './TrainingRepository.js';
import { serializePuzzleData } from '../puzzles/puzzleSerializer.js';
import { isTrainingType, trainingLevels, type TrainingType } from '../../shared/app/training/trainingLevels.js';
import {
    buildSession,
    getTrainingState,
    getUnlockedLevelsCount,
    isInLevels,
    type ProgressByPuzzle,
    SESSION_RECENT_ATTEMPTS,
    type TrainingProgressData,
} from '../../shared/app/training/trainingRules.js';
import type { TrainingAttemptInput, TrainingAttemptResult } from '../../shared/app/training/trainingDto.js';

class AttemptBody implements TrainingAttemptInput
{
    @IsString()
    puzzlePublicId: string;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(64)
    @IsBoolean({ each: true })
    lines: boolean[];

    @IsBoolean()
    hintUsed: boolean;

    @IsBoolean()
    gaveUp: boolean;

    @IsBoolean()
    inSession: boolean;
}

const toProgressData = ({ box, lapses, attemptsCount, lastAttemptAt, nextReviewAt }: TrainingProgressData): TrainingProgressData =>
    ({ box, lapses, attemptsCount, lastAttemptAt, nextReviewAt })
;

/**
 * @throws {NotFoundError} If not a training section, see trainingLevels
 */
const mustBeTrainingType = (trainingType: string): TrainingType => {
    if (!isTrainingType(trainingType)) {
        throw new NotFoundError(`Training "${trainingType}" not found`);
    }

    return trainingType;
};

/**
 * Training sections, e.g "Defend your template".
 * Sections and their puzzles are listed in trainingLevels.ts
 */
@JsonController()
@Service()
export default class TrainingController
{
    constructor(
        private puzzleRepository: PuzzleRepository,
        private trainingRepository: TrainingRepository,
    ) {}

    /**
     * @returns Puzzles by level, without puzzles not found in database
     */
    private async loadLevels(trainingType: TrainingType): Promise<Puzzle[][]>
    {
        const levels: string[][] = trainingLevels[trainingType];
        const puzzles = await this.puzzleRepository.findByPublicIds(levels.flat());
        const byPublicId = new Map(puzzles.map(puzzle => [puzzle.publicId, puzzle]));

        return levels
            .map(level => level
                .map(publicId => byPublicId.get(publicId))
                .filter(puzzle => puzzle !== undefined),
            )
            .filter(level => level.length > 0)
        ;
    }

    private async loadProgresses(trainingType: TrainingType, player: Player, levels: Puzzle[][]): Promise<ProgressByPuzzle>
    {
        const progresses = await this.trainingRepository.findProgresses(trainingType, player);
        const byPublicId: ProgressByPuzzle = new Map();

        for (const puzzle of levels.flat()) {
            const progress = progresses.get(puzzle.id);

            if (progress) {
                byPublicId.set(puzzle.publicId, toProgressData(progress));
            }
        }

        return byPublicId;
    }

    @Get('/api/trainings/:trainingType')
    async getOverview(
        @AuthenticatedPlayer() player: Player,
        @Param('trainingType') trainingTypeParam: string,
    ) {
        const trainingType = mustBeTrainingType(trainingTypeParam);
        const levels = await this.loadLevels(trainingType);
        const progresses = await this.loadProgresses(trainingType, player, levels);

        return {
            levels: levels.map(level => serializePuzzleData(level)),
            progresses: Object.fromEntries(progresses),
            unlockedLevelsCount: getUnlockedLevelsCount(levels.map(level => level.map(puzzle => puzzle.publicId)), progresses),
        };
    }

    /**
     * @returns Puzzles publicIds to play, in order
     */
    @Post('/api/trainings/:trainingType/session')
    async postSession(
        @AuthenticatedPlayer() player: Player,
        @Param('trainingType') trainingTypeParam: string,
    ): Promise<string[]> {
        const trainingType = mustBeTrainingType(trainingTypeParam);
        const levels = await this.loadLevels(trainingType);
        const progresses = await this.loadProgresses(trainingType, player, levels);
        const recentAttempts = await this.trainingRepository.findRecentAttemptsLines(trainingType, player, SESSION_RECENT_ATTEMPTS);

        return buildSession(
            levels.map(level => level.map(puzzle => puzzle.publicId)),
            progresses,
            recentAttempts,
            new Date(),
        );
    }

    @Post('/api/trainings/:trainingType/attempts')
    async postAttempt(
        @AuthenticatedPlayer() player: Player,
        @Param('trainingType') trainingTypeParam: string,
        @Body() body: AttemptBody,
    ): Promise<TrainingAttemptResult> {
        const trainingType = mustBeTrainingType(trainingTypeParam);
        const { puzzlePublicId, lines, hintUsed, gaveUp, inSession } = body;

        if (!isInLevels(puzzlePublicId, trainingLevels[trainingType])) {
            throw new BadRequestError('This puzzle is not in this training');
        }

        const [puzzle] = await this.puzzleRepository.findByPublicIds([puzzlePublicId]);

        if (!puzzle) {
            throw new NotFoundError('Puzzle not found');
        }

        const { previous, progress } = await this.trainingRepository.addAttempt(trainingType, player, puzzle, { lines, hintUsed, gaveUp, inSession });

        return {
            previousState: getTrainingState(previous),
            state: getTrainingState(progress),
            progress: toProgressData(progress),
        };
    }
}
