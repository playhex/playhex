import { t } from 'i18next';
import type { PuzzleError } from '../../../../shared/app/puzzles/puzzleTree.js';

/**
 * Translated validation error, prefixed with tree node when error is in tree.
 */
export const translatePuzzleError = ({ code, path, parallel, params }: PuzzleError): string => {
    const message = t(`puzzles.errors.${code}`, params);

    if (path === undefined) {
        return message;
    }

    let node = path.length === 0 ? t('puzzles.editor.initial_position') : path.join(' ');

    if (parallel !== undefined) {
        node = parallel.path.length === 0
            ? t('puzzles.errors.in_parallel', { node, index: parallel.index + 1 })
            : t('puzzles.errors.in_parallel_after', { node, index: parallel.index + 1, moves: parallel.path.join(' ') });
    }

    return t('puzzles.errors.in_tree', { node, message });
};
