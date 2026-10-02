import { BadRequestError, Body, Delete, Get, HttpError, JsonController, NotFoundError, OnUndefined, Param, Patch, Post } from 'routing-controllers';
import { Service } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedPlayer } from '../controllers/http/middlewares.js';
import { Player, Puzzle } from '../../shared/app/models/index.js';
import { instanceToPlain } from '../../shared/app/class-transformer-custom.js';
import { validatePuzzle, type PuzzleInput } from '../../shared/app/puzzles/puzzleTree.js';
import { canCreatePuzzleFromGame } from '../../shared/app/gameUtils.js';
import GameStore from '../store/GameStore.js';
import PuzzleRepository from './PuzzleRepository.js';

/**
 * @throws {HttpError} If player is not the puzzle author
 */
const mustBePuzzleAuthor = (puzzle: Puzzle, player: Player): void => {
    if (puzzle.author?.publicId !== player.publicId) {
        throw new HttpError(403, 'Only puzzle author can do this');
    }
};

/**
 * Publishes or unpublishes puzzle.
 * Keeps first publication date when puzzle is published again,
 * to not be able to move it back to the top of the list.
 */
const setPublished = (puzzle: Puzzle, published: boolean): void => {
    puzzle.published = published;

    if (published && puzzle.publishedAt === null) {
        puzzle.publishedAt = new Date();
    }
};

/**
 * Copies input to puzzle, then checks it.
 *
 * @throws {BadRequestError} If puzzle is invalid
 */
const applyPuzzleInput = (puzzle: Puzzle, input: PuzzleInput): void => {
    puzzle.title = typeof input.title === 'string'
        ? input.title.trim() || null
        : input.title ?? null
    ;
    puzzle.description = typeof input.description === 'string'
        ? input.description.trim() || null
        : input.description ?? null
    ;
    puzzle.boardsize = input.boardsize;
    puzzle.redStones = input.redStones;
    puzzle.blueStones = input.blueStones;
    puzzle.lastMove = input.lastMove ?? null;
    puzzle.playerColor = input.playerColor;
    puzzle.tree = input.tree;
    setPublished(puzzle, input.published === true);

    const errors = validatePuzzle(puzzle);

    if (errors.length > 0) {
        throw new BadRequestError(`Invalid puzzle: ${errors.join(', ')}`);
    }
};

@JsonController()
@Service()
export default class PuzzleController
{
    constructor(
        private puzzleRepository: PuzzleRepository,
        private gameStore: GameStore,
    ) {}

    @Get('/api/puzzles')
    async getPuzzles()
    {
        return instanceToPlain(await this.puzzleRepository.findPublishedForList());
    }

    @Get('/api/puzzles/drafts')
    async getPuzzleDrafts(
        @AuthenticatedPlayer() player: Player,
    ) {
        return instanceToPlain(await this.puzzleRepository.findUnpublishedByAuthor(player));
    }

    @Get('/api/puzzles/:publicId')
    async getPuzzle(
        @Param('publicId') publicId: string,
    ) {
        const puzzle = await this.puzzleRepository.findPuzzleByPublicId(publicId);

        if (puzzle === null) {
            throw new NotFoundError(`Puzzle "${publicId}" not found`);
        }

        return instanceToPlain(puzzle);
    }

    @Post('/api/puzzles')
    async postPuzzle(
        @AuthenticatedPlayer() player: Player,
        @Body({ required: true }) input: PuzzleInput,
    ) {
        const puzzle = new Puzzle();

        puzzle.publicId = uuidv4();
        puzzle.author = player;
        puzzle.game = null;
        puzzle.publishedAt = null;

        if (input.gamePublicId) {
            const game = await this.gameStore.getActiveOrArchivedGame(input.gamePublicId);

            if (game === null || game.id === undefined) {
                throw new NotFoundError(`Game "${input.gamePublicId}" not found`);
            }

            // Prevent creating a puzzle from a game in progress, to get help from others
            if (!canCreatePuzzleFromGame(game)) {
                throw new HttpError(403, 'Cannot create a puzzle from this game now');
            }

            puzzle.game = game;
        }

        applyPuzzleInput(puzzle, input);

        await this.puzzleRepository.save(puzzle);

        return instanceToPlain(puzzle);
    }

    /**
     * Shortcut to publish a draft without editing it.
     */
    @Post('/api/puzzles/:publicId/publish')
    async publishPuzzle(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
    ) {
        const puzzle = await this.puzzleRepository.findPuzzleByPublicId(publicId);

        if (puzzle === null) {
            throw new NotFoundError(`Puzzle "${publicId}" not found`);
        }

        mustBePuzzleAuthor(puzzle, player);
        setPublished(puzzle, true);

        await this.puzzleRepository.save(puzzle);

        return instanceToPlain(puzzle);
    }

    @Patch('/api/puzzles/:publicId')
    async patchPuzzle(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Body({ required: true }) input: PuzzleInput,
    ) {
        const puzzle = await this.puzzleRepository.findPuzzleByPublicId(publicId);

        if (puzzle === null) {
            throw new NotFoundError(`Puzzle "${publicId}" not found`);
        }

        mustBePuzzleAuthor(puzzle, player);
        applyPuzzleInput(puzzle, input);

        await this.puzzleRepository.save(puzzle);

        return instanceToPlain(puzzle);
    }

    @Delete('/api/puzzles/:publicId')
    @OnUndefined(204)
    async deletePuzzle(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
    ): Promise<void> {
        const puzzle = await this.puzzleRepository.findPuzzleByPublicId(publicId);

        if (puzzle === null) {
            throw new NotFoundError(`Puzzle "${publicId}" not found`);
        }

        mustBePuzzleAuthor(puzzle, player);

        await this.puzzleRepository.remove(puzzle);
    }
}
