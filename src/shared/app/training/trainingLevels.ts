import { defendYourTemplateTraining } from './sections/defendYourTemplateTraining.js';

/**
 * Training sections content: puzzles publicIds by level, one file per section in sections/.
 * Each level is a list of puzzles of similar difficulty, displayed and proposed in this order.
 * Puzzles not found in database (e.g. prod puzzles in dev) are ignored.
 *
 * See docs/training-sections.md
 */
export const trainingLevels = {
    'defend-your-template': defendYourTemplateTraining,
} satisfies { [trainingType: string]: string[][] };

/**
 * Training section name, stored in TrainingAttempt and TrainingProgress.
 * Max 32 chars.
 */
export type TrainingType = keyof typeof trainingLevels;

export const isTrainingType = (value: string): value is TrainingType =>
    Object.prototype.hasOwnProperty.call(trainingLevels, value)
;
