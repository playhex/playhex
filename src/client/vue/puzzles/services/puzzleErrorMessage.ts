import { t } from 'i18next';
import type { PuzzleError } from '../../../../shared/app/puzzles/puzzleTree.js';

/**
 * Translated validation error, prefixed with tree node when error is in tree.
 */
export const translatePuzzleError = ({ code, path, params }: PuzzleError): string => {
    const message = t(`puzzles.errors.${code}`, params);

    if (path === undefined) {
        return message;
    }

    return t('puzzles.errors.in_tree', {
        node: path.length === 0 ? t('puzzles.editor.initial_position') : path.join(' '),
        message,
    });
};
