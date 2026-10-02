import { t } from 'i18next';
import type { Puzzle } from '../../../../shared/app/models/index.js';

/**
 * Puzzle title, or "Puzzle 3ca500" from public id when puzzle has no title.
 */
export const getPuzzleTitle = (puzzle: Pick<Puzzle, 'title' | 'publicId'>): string =>
    puzzle.title || t('puzzles.default_title', { id: puzzle.publicId.substring(0, 6) });
