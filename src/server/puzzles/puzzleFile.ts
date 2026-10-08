import { readFile } from 'node:fs/promises';
import type { Move } from '@playhex/move-notation';
import { v4 as uuidv4 } from 'uuid';
import { Puzzle } from '../../shared/app/models/index.js';
import { deserializeMoves } from '../../shared/app/movesSerializer.js';
import { normalizePuzzleText } from '../../shared/app/puzzles/puzzleTree.js';

/**
 * Expected json file format, see examples/ folder.
 * Stones are space separated, like in database: "a1 b3 c4".
 */
type PuzzleFile = {
    title?: null | string;
    description?: null | string;
    boardsize: number;
    redStones?: string;
    blueStones?: string;
    disabledCells?: string;
    lastMove?: null | Move;
    playerColor: 'red' | 'blue';
    tree: Puzzle['tree'];

    /**
     * Defaults to true
     */
    published?: boolean;
};

export class PuzzleFileError extends Error {}

/**
 * Reads a puzzle json file, see examples/ folder. Puzzle is not validated.
 *
 * @throws {PuzzleFileError}
 */
export const readPuzzleFile = async (file: string): Promise<Puzzle> => {
    const input = JSON.parse(await readFile(file, 'utf-8')) as PuzzleFile;

    if (input.playerColor !== 'red' && input.playerColor !== 'blue') {
        throw new PuzzleFileError(`playerColor must be "red" or "blue", got "${String(input.playerColor)}"`);
    }

    const puzzle = new Puzzle();

    puzzle.publicId = uuidv4();
    puzzle.title = normalizePuzzleText(input.title);
    puzzle.description = normalizePuzzleText(input.description);
    puzzle.boardsize = input.boardsize;
    puzzle.redStones = deserializeMoves(input.redStones);
    puzzle.blueStones = deserializeMoves(input.blueStones);
    puzzle.disabledCells = deserializeMoves(input.disabledCells);
    puzzle.lastMove = input.lastMove ?? null;
    puzzle.playerColor = input.playerColor === 'red' ? 0 : 1;
    puzzle.tree = input.tree;
    puzzle.author = null;
    puzzle.game = null;
    puzzle.collection = null;
    puzzle.collectionPosition = null;
    puzzle.published = input.published ?? true;
    puzzle.publishedAt = puzzle.published ? new Date() : null;

    return puzzle;
};
