import { normalizePuzzleText } from './puzzleTree.js';

export type PuzzleCollectionInput = {
    name: string;
    description?: null | string;
};

export const PUZZLE_COLLECTION_NAME_MAX_LENGTH = 64;
export const PUZZLE_COLLECTION_DESCRIPTION_MAX_LENGTH = 2048;
export const PUZZLE_COLLECTION_MAX_PUZZLES = 200;

/**
 * Trimmed name and description, description null if empty.
 */
export const normalizePuzzleCollectionInput = (input: PuzzleCollectionInput): { name: string, description: null | string } => ({
    name: typeof input.name === 'string' ? input.name.trim() : '',
    description: normalizePuzzleText(input.description),
});

/**
 * Not translated, for server side error messages.
 * Client form prevents these errors with required and maxlength.
 *
 * @returns Errors, empty if valid
 */
export const validatePuzzleCollectionInput = (input: PuzzleCollectionInput): string[] => {
    const { name, description } = normalizePuzzleCollectionInput(input);
    const errors: string[] = [];

    if (name === '') {
        errors.push('Name is required');
    } else if (name.length > PUZZLE_COLLECTION_NAME_MAX_LENGTH) {
        errors.push(`Name must have at most ${PUZZLE_COLLECTION_NAME_MAX_LENGTH} characters`);
    }

    if (description !== null && description.length > PUZZLE_COLLECTION_DESCRIPTION_MAX_LENGTH) {
        errors.push(`Description must have at most ${PUZZLE_COLLECTION_DESCRIPTION_MAX_LENGTH} characters`);
    }

    return errors;
};

/**
 * Returns a copy of list with item at index moved by offset (-1: up, 1: down).
 * Returns an unchanged copy if item would move outside the list.
 */
export const moveInList = <T>(list: T[], index: number, offset: number): T[] => {
    const copy = [...list];
    const target = index + offset;

    if (index < 0 || index >= list.length || target < 0 || target >= list.length) {
        return copy;
    }

    [copy[index], copy[target]] = [copy[target], copy[index]];

    return copy;
};
