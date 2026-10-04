import { HttpError } from 'routing-controllers';
import { Player, Puzzle, PuzzleCollection } from '../../shared/app/models/index.js';

/**
 * @throws {HttpError} If player is not the puzzle author
 */
export const mustBePuzzleAuthor = (puzzle: Puzzle, player: Player): void => {
    if (puzzle.author?.publicId !== player.publicId) {
        throw new HttpError(403, 'Only puzzle author can do this');
    }
};

/**
 * @throws {HttpError} If player is not the collection author
 */
export const mustBeCollectionAuthor = (collection: PuzzleCollection, player: Player): void => {
    if (collection.author?.publicId !== player.publicId) {
        throw new HttpError(403, 'Only collection author can do this');
    }
};
