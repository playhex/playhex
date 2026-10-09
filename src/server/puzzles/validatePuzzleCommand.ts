import { existsSync } from 'node:fs';
import { Container } from 'typedi';
import { Option } from '@commander-js/extra-typings';
import hexProgram from '../commands/hexProgram.js';
import { AppDataSource } from '../data-source.js';
import { Puzzle } from '../../shared/app/models/index.js';
import { puzzleErrorToString, validatePuzzle, type PuzzleDefinition } from '../../shared/app/puzzles/puzzleTree.js';
import { PUZZLE_CHECK_ENGINES, type PuzzleCheckInput, type PuzzleCheckState } from '../../shared/app/puzzles/puzzleCheck.js';
import PuzzleRepository from './PuzzleRepository.js';
import { PuzzleFileError, readPuzzleFile } from './puzzleFile.js';

const POLL_INTERVAL_MS = 2000;

/**
 * @throws {PuzzleFileError}
 */
const loadPuzzle = async (publicIdOrFile: string): Promise<Puzzle> => {
    if (existsSync(publicIdOrFile)) {
        return await readPuzzleFile(publicIdOrFile);
    }

    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }

    const puzzle = await Container.get(PuzzleRepository).findPuzzleByPublicId(publicIdOrFile);

    if (puzzle === null) {
        throw new PuzzleFileError(`No file nor puzzle with publicId "${publicIdOrFile}"`);
    }

    return puzzle;
};

const toDefinition = (puzzle: Puzzle): PuzzleDefinition => ({
    title: puzzle.title,
    description: puzzle.description,
    boardsize: puzzle.boardsize,
    redStones: puzzle.redStones,
    blueStones: puzzle.blueStones,
    disabledCells: puzzle.disabledCells,
    lastMove: puzzle.lastMove,
    playerColor: puzzle.playerColor,
    tree: puzzle.tree,
});

/**
 * Katahex check runs on server, as AI jobs results are only received by server process.
 * Polls until check is done.
 */
const runPuzzleCheck = async (server: string, input: PuzzleCheckInput): Promise<PuzzleCheckState> => {
    const { ADMIN_PASSWORD } = process.env;

    if (!ADMIN_PASSWORD) {
        throw new Error('ADMIN_PASSWORD must be set to run katahex check on server');
    }

    for (;;) {
        const response = await fetch(`${server}/api/admin/puzzles/katahex-check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${ADMIN_PASSWORD}`,
            },
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            throw new Error(`Server responded ${response.status}: ${await response.text()}`);
        }

        const state = await response.json() as PuzzleCheckState;

        if (state.status !== 'running') {
            process.stderr.write('\n');
            return state;
        }

        process.stderr.write(`\r${state.engine === 'mohex-solver' ? 'Solving' : 'Analyzing'} positions: ${state.done}/${state.total}`);
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
};

hexProgram
    .command('puzzle-validate')
    .description('Validate puzzle tree, then check it with katahex or mohex solver on running server (needs ADMIN_PASSWORD)')
    .argument('<publicIdOrFile>', 'Puzzle publicId, or path to puzzle json file, see src/server/puzzles/examples/')
    .addOption(new Option('--engine <engine>', 'Engine to evaluate positions, or mohex-solver to prove them').choices(PUZZLE_CHECK_ENGINES).default('katahex-intuition' as const))
    .option('--server <url>', 'Server running AI jobs, defaults to BASE_URL, or http://localhost:3000')
    .option('--no-katahex', 'Only validate tree')
    .action(async (publicIdOrFile, { engine, server, katahex }) => {
        let puzzle: Puzzle;

        try {
            puzzle = await loadPuzzle(publicIdOrFile);
        } catch (e) {
            if (e instanceof PuzzleFileError) {
                console.error(e.message);
                process.exit(1);
            }

            throw e;
        }

        const definition = toDefinition(puzzle);
        const errors = validatePuzzle(definition);

        if (errors.length > 0) {
            console.error('Invalid puzzle:');

            for (const error of errors) {
                console.error(` - ${puzzleErrorToString(error)}`);
            }

            process.exit(1);
        }

        console.log('Puzzle tree is valid.');

        if (!katahex) {
            return;
        }

        const serverUrl = (server ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
        let state: PuzzleCheckState;

        try {
            state = await runPuzzleCheck(serverUrl, { puzzle: definition, engine });
        } catch (e) {
            console.error(`Could not run katahex check on ${serverUrl}: ${(e as Error).message}`);
            process.exit(1);
        }

        if (state.status === 'failed') {
            console.error(`Check failed: ${state.error}`);
            process.exit(1);
        }

        if (state.warnings.length === 0) {
            console.log(`${engine} agrees with puzzle tree.`);
            return;
        }

        console.log(`${engine} warnings:`);

        for (const warning of state.warnings) {
            console.log(` - ${puzzleErrorToString(warning)}`);
        }

        process.exit(1);
    })
;
