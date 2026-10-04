import { BadRequestError, Body, Delete, Get, HttpError, JsonController, NotFoundError, OnUndefined, Param, Post, Put } from 'routing-controllers';
import { Service } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedPlayer } from '../controllers/http/middlewares.js';
import { Player, Puzzle } from '../../shared/app/models/index.js';
import { instanceToPlain } from '../../shared/app/class-transformer-custom.js';
import { isDraftBlockingError, normalizePuzzleText, puzzleErrorToString, validatePuzzle, type PuzzleInput } from '../../shared/app/puzzles/puzzleTree.js';
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
 * Checks puzzle can be saved: a draft can be incomplete, but a published puzzle must be valid.
 *
 * @throws {BadRequestError} If puzzle cannot be saved
 */
const mustBeSavable = (puzzle: Puzzle): void => {
    const errors = validatePuzzle(puzzle).filter(error => puzzle.published || isDraftBlockingError(error));

    if (errors.length > 0) {
        throw new BadRequestError(`Invalid puzzle: ${errors.map(puzzleErrorToString).join(', ')}`);
    }
};

/**
 * Copies input to puzzle, then checks it.
 *
 * @throws {BadRequestError} If puzzle cannot be saved
 */
const applyPuzzleInput = (puzzle: Puzzle, input: PuzzleInput): void => {
    puzzle.title = normalizePuzzleText(input.title);
    puzzle.description = normalizePuzzleText(input.description);
    puzzle.boardsize = input.boardsize;
    puzzle.redStones = input.redStones;
    puzzle.blueStones = input.blueStones;
    puzzle.disabledCells = input.disabledCells ?? [];
    puzzle.lastMove = input.lastMove ?? null;
    puzzle.playerColor = input.playerColor;
    puzzle.tree = input.tree;
    setPublished(puzzle, input.published === true);
    mustBeSavable(puzzle);
};

/**
 * Only fields displayed on puzzle page, e.g not the whole source game.
 */
const serializePuzzle = (puzzle: Puzzle | Puzzle[]) => instanceToPlain(puzzle, { groups: ['puzzle'] });

/**
 * Body size limit, as a tree with many nodes and messages can exceed default 100kb.
 */
const BODY_OPTIONS = { required: true, options: { limit: '1mb' } };

@JsonController()
@Service()
export default class PuzzleController
{
    constructor(
        private puzzleRepository: PuzzleRepository,
        private gameStore: GameStore,
    ) {}

    /**
     * @throws {NotFoundError}
     */
    private async getPuzzleOrFail(publicId: string): Promise<Puzzle>
    {
        const puzzle = await this.puzzleRepository.findPuzzleByPublicId(publicId);

        if (puzzle === null) {
            throw new NotFoundError('Puzzle not found');
        }

        return puzzle;
    }

    @Get('/api/puzzles')
    async getPuzzles()
    {
        return serializePuzzle(await this.puzzleRepository.findPublishedForList());
    }

    @Get('/api/puzzles/mine')
    async getMyPuzzles(
        @AuthenticatedPlayer() player: Player,
    ) {
        return serializePuzzle(await this.puzzleRepository.findByAuthor(player));
    }

    @Get('/api/puzzles/:publicId')
    async getPuzzle(
        @Param('publicId') publicId: string,
    ) {
        const puzzle = await this.getPuzzleOrFail(publicId);

        return serializePuzzle(puzzle);
    }

    @Post('/api/puzzles')
    async postPuzzle(
        @AuthenticatedPlayer() player: Player,
        @Body(BODY_OPTIONS) input: PuzzleInput,
    ) {
        const puzzle = new Puzzle();

        puzzle.publicId = uuidv4();
        puzzle.author = player;
        puzzle.game = null;
        puzzle.publishedAt = null;

        if (input.gamePublicId) {
            const game = await this.gameStore.getActiveOrArchivedGame(input.gamePublicId);

            if (game === null) {
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

        return serializePuzzle(puzzle);
    }

    /**
     * Shortcut to publish a draft without editing it.
     */
    @Post('/api/puzzles/:publicId/publish')
    async publishPuzzle(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
    ) {
        const puzzle = await this.getPuzzleOrFail(publicId);

        mustBePuzzleAuthor(puzzle, player);
        setPublished(puzzle, true);
        mustBeSavable(puzzle);

        await this.puzzleRepository.save(puzzle);

        return serializePuzzle(puzzle);
    }

    @Put('/api/puzzles/:publicId')
    async putPuzzle(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Body(BODY_OPTIONS) input: PuzzleInput,
    ) {
        const puzzle = await this.getPuzzleOrFail(publicId);

        mustBePuzzleAuthor(puzzle, player);
        applyPuzzleInput(puzzle, input);

        await this.puzzleRepository.save(puzzle);

        return serializePuzzle(puzzle);
    }

    @Delete('/api/puzzles/:publicId')
    @OnUndefined(204)
    async deletePuzzle(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
    ): Promise<void> {
        const puzzle = await this.getPuzzleOrFail(publicId);

        mustBePuzzleAuthor(puzzle, player);

        await this.puzzleRepository.remove(puzzle);
    }
}
