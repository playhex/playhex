/**
 * Training sections business rules.
 *
 * A training section is a list of puzzles, by level, that players replay over time until they master them.
 * Sections and their puzzles are listed in trainingLevels.ts.
 *
 * Every rule lives here, as pure functions: no database, no I/O, no clock
 * (current date is always passed as parameter).
 */

/*
 * ============================================================
 * Levels
 * ============================================================
 */

/**
 * @param levels Puzzles publicIds by level, see trainingLevels
 *
 * @returns Level of this puzzle, starting at 1, or null if not in these levels
 */
export const getPuzzleLevel = (puzzlePublicId: string, levels: string[][]): null | number => {
    const index = levels.findIndex(level => level.includes(puzzlePublicId));

    return index === -1 ? null : index + 1;
};

export const isInLevels = (puzzlePublicId: string, levels: string[][]): boolean =>
    getPuzzleLevel(puzzlePublicId, levels) !== null
;

/*
 * ============================================================
 * Progress
 * ============================================================
 */

export type TrainingProgressData = {
    /**
     * Leitner box, from 0 to MAX_BOX.
     * Goes up when solved perfectly, down when failed.
     */
    box: number;

    /**
     * Times this puzzle was acquired then failed again.
     * Makes reviews more frequent.
     */
    lapses: number;

    attemptsCount: number;
    lastAttemptAt: Date;
    nextReviewAt: Date;
};

export type TrainingState =
    /** Never tried */
    'new'

    /** Tried, but not solved well enough yet */
    | 'not_acquired'

    | 'in_progress'

    | 'acquired'
;

/**
 * - perfect: all lines solved first try
 * - good: at least half of lines solved first try
 * - bad: otherwise
 */
export type AttemptScore = 'perfect' | 'good' | 'bad';

const DAY = 24 * 3600 * 1000;

export const MAX_BOX = 5;

/**
 * Delay before next review, indexed by box.
 */
export const REVIEW_INTERVALS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY];

/**
 * Intervals are multiplied by this factor for each lapse,
 * so a forgotten puzzle comes back more often.
 */
export const LAPSE_FACTOR = 0.7;

/**
 * Box from which a puzzle is acquired.
 */
export const ACQUIRED_BOX = 3;

/**
 * @param lines One entry per line (intrusion), true if solved first try, without wrong move nor hint
 */
export const scoreAttempt = (lines: boolean[]): AttemptScore => {
    const solved = lines.filter(Boolean).length;

    if (lines.length > 0 && solved === lines.length) {
        return 'perfect';
    }

    if (lines.length > 0 && solved * 2 >= lines.length) {
        return 'good';
    }

    return 'bad';
};

export const getTrainingState = (progress: null | Pick<TrainingProgressData, 'box'>): TrainingState => {
    if (progress === null) {
        return 'new';
    }

    if (progress.box >= ACQUIRED_BOX) {
        return 'acquired';
    }

    if (progress.box >= 1) {
        return 'in_progress';
    }

    return 'not_acquired';
};

export const getNextReviewAt = (box: number, lapses: number, now: Date): Date =>
    new Date(now.getTime() + Math.round(REVIEW_INTERVALS[box] * LAPSE_FACTOR ** lapses))
;

export const isDue = (progress: Pick<TrainingProgressData, 'nextReviewAt'>, now: Date): boolean =>
    progress.nextReviewAt.getTime() <= now.getTime()
;

/**
 * @param progress Current progress, null if first attempt
 *
 * @returns New progress, input is not mutated
 */
export const applyAttempt = (progress: null | TrainingProgressData, lines: boolean[], now: Date): TrainingProgressData => {
    const previousBox = progress?.box ?? 0;
    let box: number;
    let lapses = progress?.lapses ?? 0;

    switch (scoreAttempt(lines)) {
        case 'perfect':
            box = Math.min(MAX_BOX, previousBox + 1);
            break;

        case 'good':
            box = Math.max(1, previousBox);
            break;

        case 'bad':
            box = Math.max(0, previousBox - 2);

            if (getTrainingState(progress) === 'acquired') {
                ++lapses;
            }

            break;
    }

    return {
        box,
        lapses,
        attemptsCount: (progress?.attemptsCount ?? 0) + 1,
        lastAttemptAt: now,
        nextReviewAt: getNextReviewAt(box, lapses, now),
    };
};

/*
 * ============================================================
 * Unlocking and sessions
 * ============================================================
 */

/**
 * Ratio of acquired puzzles of a level required to unlock next level.
 */
export const UNLOCK_ACQUIRED_RATIO = 0.6;

export const SESSION_SIZE = 10;
export const SESSION_MAX_WARM_UP = 2;
export const SESSION_MAX_CORE = 6;

/**
 * Number of last attempts used to choose how many new puzzles to propose.
 */
export const SESSION_RECENT_ATTEMPTS = 20;

export type ProgressByPuzzle = Map<string, TrainingProgressData>;

/**
 * Level N+1 is unlocked when all puzzles of level N have been tried,
 * and at least UNLOCK_ACQUIRED_RATIO of them are acquired.
 * First level is always unlocked.
 *
 * @returns Number of unlocked levels, e.g 1 if only first level is unlocked
 */
export const getUnlockedLevelsCount = (levels: string[][], progresses: ProgressByPuzzle): number => {
    let unlocked = Math.min(1, levels.length);

    while (unlocked < levels.length) {
        const level = levels[unlocked - 1];
        const states = level.map(publicId => getTrainingState(progresses.get(publicId) ?? null));

        if (states.includes('new')) {
            break;
        }

        const acquired = states.filter(state => state === 'acquired').length;

        if (acquired < UNLOCK_ACQUIRED_RATIO * level.length) {
            break;
        }

        ++unlocked;
    }

    return unlocked;
};

/**
 * How many new puzzles to propose, depending on recent results.
 *
 * @param recentAttempts Lines of last attempts
 */
export const getNewPuzzlesCount = (recentAttempts: boolean[][]): number => {
    if (recentAttempts.length === 0) {
        return 3;
    }

    const successes = recentAttempts.filter(lines => scoreAttempt(lines) !== 'bad').length;
    const rate = successes / recentAttempts.length;

    if (rate >= 0.8) {
        return 3;
    }

    if (rate >= 0.6) {
        return 2;
    }

    return 1;
};

const shuffle = <T>(items: T[], random: () => number): T[] => {
    const shuffled = [...items];

    for (let i = shuffled.length - 1; i > 0; --i) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
};

/**
 * Builds an adaptive training session:
 * 1. warm-up: acquired puzzles due for review, oldest first
 * 2. core: puzzles in progress or not acquired, due first, then lowest box
 * 3. new puzzles from unlocked levels, more when recent results are good
 * 4. remaining slots: new puzzles for a beginner (nothing acquired),
 *    other acquired puzzles otherwise.
 *
 * Warm-up stays first, the rest is shuffled.
 *
 * @param levels Puzzles publicIds by level, only existing puzzles
 * @param recentAttempts Lines of last attempts, see SESSION_RECENT_ATTEMPTS
 *
 * @returns Puzzles publicIds to play, in order
 */
export const buildSession = (
    levels: string[][],
    progresses: ProgressByPuzzle,
    recentAttempts: boolean[][],
    now: Date,
    size = SESSION_SIZE,
    random: () => number = Math.random,
): string[] => {
    const allPuzzles = levels.flat();
    const tried = allPuzzles
        .filter(publicId => progresses.has(publicId))
        .map(publicId => ({ publicId, progress: progresses.get(publicId)! }))
    ;
    const byNextReview = (a: { progress: TrainingProgressData }, b: { progress: TrainingProgressData }) =>
        a.progress.nextReviewAt.getTime() - b.progress.nextReviewAt.getTime()
    ;

    const acquired = tried.filter(({ progress }) => getTrainingState(progress) === 'acquired');

    const warmUp = acquired
        .filter(({ progress }) => isDue(progress, now))
        .sort(byNextReview)
        .slice(0, Math.min(SESSION_MAX_WARM_UP, size))
        .map(({ publicId }) => publicId)
    ;

    const core = tried
        .filter(({ progress }) => getTrainingState(progress) !== 'acquired')
        .sort((a, b) =>
            Number(isDue(b.progress, now)) - Number(isDue(a.progress, now))
            || a.progress.box - b.progress.box
            || byNextReview(a, b),
        )
        .slice(0, Math.max(0, Math.min(SESSION_MAX_CORE, size - warmUp.length)))
        .map(({ publicId }) => publicId)
    ;

    const newPuzzles = levels
        .slice(0, getUnlockedLevelsCount(levels, progresses))
        .flat()
        .filter(publicId => !progresses.has(publicId))
    ;

    let remaining = size - warmUp.length - core.length;
    const newCount = core.length >= SESSION_MAX_CORE
        ? 0
        : Math.min(remaining, getNewPuzzlesCount(recentAttempts))
    ;
    const news = newPuzzles.slice(0, newCount);

    remaining -= news.length;

    const fill: string[] = [];

    if (remaining > 0) {
        const otherAcquired = acquired
            .filter(({ publicId }) => !warmUp.includes(publicId))
            .sort(byNextReview)
            .map(({ publicId }) => publicId)
        ;
        const otherNews = newPuzzles.slice(news.length);

        fill.push(...(acquired.length === 0 ? otherNews : otherAcquired).slice(0, remaining));
    }

    return [
        ...warmUp,
        ...shuffle([...core, ...news, ...fill], random),
    ];
};
