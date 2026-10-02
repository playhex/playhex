import { readFile } from 'node:fs/promises';
import { Container } from 'typedi';
import type { Move } from '@playhex/move-notation';
import { v4 as uuidv4 } from 'uuid';
import hexProgram from '../commands/hexProgram.js';
import { AppDataSource } from '../data-source.js';
import { Puzzle } from '../../shared/app/models/index.js';
import { deserializeMoves } from '../../shared/app/movesSerializer.js';
import { validatePuzzle } from '../../shared/app/puzzles/puzzleTree.js';
import PuzzleRepository from './PuzzleRepository.js';

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
    lastMove?: null | Move;
    playerColor: 'red' | 'blue';
    tree: Puzzle['tree'];

    /**
     * Defaults to true
     */
    published?: boolean;
};

hexProgram
    .command('create-puzzle')
    .description('Create a puzzle from a json file, see src/server/puzzles/examples/')
    .argument('<file>', 'Path to puzzle json file')
    .action(async file => {
        const input = JSON.parse(await readFile(file, 'utf-8')) as PuzzleFile;

        if (input.playerColor !== 'red' && input.playerColor !== 'blue') {
            console.error(`playerColor must be "red" or "blue", got "${String(input.playerColor)}"`);
            process.exit(1);
        }

        const puzzle = new Puzzle();

        puzzle.publicId = uuidv4();
        puzzle.title = input.title || null;
        puzzle.description = input.description ?? null;
        puzzle.boardsize = input.boardsize;
        puzzle.redStones = deserializeMoves(input.redStones);
        puzzle.blueStones = deserializeMoves(input.blueStones);
        puzzle.lastMove = input.lastMove ?? null;
        puzzle.playerColor = input.playerColor === 'red' ? 0 : 1;
        puzzle.tree = input.tree;
        puzzle.author = null;
        puzzle.game = null;
        puzzle.published = input.published ?? true;
        puzzle.publishedAt = puzzle.published ? new Date() : null;

        const errors = validatePuzzle(puzzle);

        if (errors.length > 0) {
            console.error('Invalid puzzle:');

            for (const error of errors) {
                console.error(` - ${error}`);
            }

            process.exit(1);
        }

        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        await Container.get(PuzzleRepository).save(puzzle);

        console.log(`Puzzle created: /puzzles/${puzzle.publicId}`);
    })
;
