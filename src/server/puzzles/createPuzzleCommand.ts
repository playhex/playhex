import { Container } from 'typedi';
import hexProgram from '../commands/hexProgram.js';
import { AppDataSource } from '../data-source.js';
import { puzzleErrorToString, validatePuzzle } from '../../shared/app/puzzles/puzzleTree.js';
import PuzzleRepository from './PuzzleRepository.js';
import { PuzzleFileError, readPuzzleFile } from './puzzleFile.js';

hexProgram
    .command('create-puzzle')
    .description('Create a puzzle from a json file, see src/server/puzzles/examples/')
    .argument('<file>', 'Path to puzzle json file')
    .action(async file => {
        let puzzle;

        try {
            puzzle = await readPuzzleFile(file);
        } catch (e) {
            if (e instanceof PuzzleFileError) {
                console.error(e.message);
                process.exit(1);
            }

            throw e;
        }

        const errors = validatePuzzle(puzzle);

        if (errors.length > 0) {
            console.error('Invalid puzzle:');

            for (const error of errors) {
                console.error(` - ${puzzleErrorToString(error)}`);
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
