import type Puzzle from '../models/Puzzle.js';
import type { TrainingProgressData, TrainingState } from './trainingRules.js';

export type TrainingOverview = {
    /**
     * Puzzles by level, only puzzles found in database.
     */
    levels: Puzzle[][];

    /**
     * Current player progress, by puzzle publicId. Missing when never tried.
     */
    progresses: { [puzzlePublicId: string]: TrainingProgressData };

    unlockedLevelsCount: number;
};

export type TrainingAttemptInput = {
    puzzlePublicId: string;

    /**
     * One entry per line, true if solved first try, without wrong move nor hint.
     */
    lines: boolean[];

    hintUsed: boolean;
    gaveUp: boolean;
    inSession: boolean;
};

export type TrainingAttemptResult = {
    previousState: TrainingState;
    state: TrainingState;
    progress: TrainingProgressData;
};
