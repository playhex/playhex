import { intlFormat } from 'date-fns';
import { Puzzle } from '../../../../shared/app/models/index.js';
import { autoLocale } from '../../../../shared/app/i18n/index.js';

/**
 * Publication date, or creation date for unpublished puzzles.
 */
export const formatPuzzleDate = (puzzle: Puzzle): string => intlFormat(
    puzzle.publishedAt ?? puzzle.createdAt,
    { day: 'numeric', month: 'short', year: 'numeric' },
    { locale: autoLocale() },
);
