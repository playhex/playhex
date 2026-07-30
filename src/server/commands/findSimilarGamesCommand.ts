import { Container } from 'typedi';
import { MoreThan, Repository } from 'typeorm';
import { AppDataSource } from '../data-source.js';
import { Game } from '../../shared/app/models/index.js';
import { comparableBoardsizes, comparePositions, createCanonicalPosition, InvalidPositionError, type CandidatePosition, type ComparisonResult } from '../../shared/position-comparator/position-comparator.js';
import hexProgram from './hexProgram.js';

const { BASE_URL } = process.env;

const gameSource = (publicId: string): string => BASE_URL
    ? BASE_URL + '/games/' + publicId
    : publicId
;

/**
 * Number of games loaded from database at once.
 */
const BATCH_SIZE = 5000;

hexProgram
    .command('find-similar-games')
    .description('Find the games most similar to a given game, among all other games in database')
    .requiredOption('--game <publicId>', 'Public id (uuid) of the reference game')
    .option('--top <number>', 'Number of similar games to return', '5')
    .action(async ({ game: gamePublicId, top }) => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const topCount = parseInt(top, 10);

        if (!Number.isInteger(topCount) || topCount < 1) {
            throw new Error(`--top must be a positive integer, got "${top}"`);
        }
        const gameRepository = Container.get<Repository<Game>>('Repository<Game>');

        const reference = await gameRepository.findOne({
            select: { id: true, publicId: true, boardsize: true, moves: true },
            where: { publicId: gamePublicId },
        });

        if (reference === null) {
            throw new Error(`No game found with publicId "${gamePublicId}"`);
        }

        const referenceCanonical = createCanonicalPosition({ boardsize: reference.boardsize, moves: reference.moves });

        console.log(`Reference game: ${reference.moves.length} moves, ${gameSource(gamePublicId)}`);

        const boardsizes = comparableBoardsizes(reference.boardsize);

        let topMatches: ComparisonResult[] = [];
        let lastId = 0;
        let comparedCount = 0;

        // Only select the columns needed for the comparison, and by batches, to keep this cheap on a large games table.
        while (true) {
            const candidates = await gameRepository.find({
                select: { id: true, publicId: true, boardsize: true, moves: true },
                where: boardsizes.map(boardsize => ({ id: MoreThan(lastId), boardsize })),
                order: { id: 'asc' },
                take: BATCH_SIZE,
            });

            if (candidates.length === 0) {
                break;
            }

            lastId = candidates[candidates.length - 1].id!;
            comparedCount += candidates.length;

            const results = comparePositions(
                referenceCanonical,
                candidates
                    .filter(candidate => candidate.publicId !== gamePublicId && candidate.moves.length > 0)
                    .map((candidate): CandidatePosition => {
                        try {
                            return { ...createCanonicalPosition(candidate), gamePublicId: candidate.publicId };
                        } catch (e) {
                            // Stop here, with the malformed game in the error
                            if (e instanceof InvalidPositionError) {
                                throw new Error(`Malformed moves in game "${candidate.publicId}": ${e.message}`);
                            }

                            throw e;
                        }
                    }),
                () => true,
                0,
            );

            topMatches = [...topMatches, ...results.slice(0, topCount)]
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, topCount)
            ;
        }

        console.log(`Compared against ${comparedCount} games of boardsize ${boardsizes.join(', ')}.`);
        console.log(`Top ${topMatches.length} most similar games to "${gamePublicId}":`);

        topMatches.forEach((match, i) => {
            console.log(`${i + 1}. ${match.position.gamePublicId} (similarity: ${match.similarity.toFixed(3)}, common stones: ${match.common}, mirror: ${match.mirror || 'none'}) ${gameSource(match.position.gamePublicId!)}`);
        });
    })
;
