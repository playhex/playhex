import { instanceToPlain } from '../../shared/app/class-transformer-custom.js';

/**
 * Serializes puzzles and collections with only fields displayed on puzzle pages,
 * e.g not the whole source game.
 */
export const serializePuzzleData = (data: object) => instanceToPlain(data, { groups: ['puzzle'] });
