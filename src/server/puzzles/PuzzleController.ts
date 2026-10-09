import { Authorized, BadRequestError, Body, Delete, Get, HttpError, JsonController, NotFoundError, OnUndefined, Param, Post, Put, Req } from 'routing-controllers';
import type { Request } from 'express';
import { Service } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedPlayer } from '../controllers/http/middlewares.js';
import { Player, Puzzle, PuzzleCollection } from '../../shared/app/models/index.js';
import { isDraftBlockingError, normalizePuzzleText, puzzleErrorToString, validatePuzzle, type PuzzleInput } from '../../shared/app/puzzles/puzzleTree.js';
import { PUZZLE_COLLECTION_MAX_PUZZLES } from '../../shared/app/puzzles/puzzleCollection.js';
import { canCreatePuzzleFromGame } from '../../shared/app/gameUtils.js';
import GameStore from '../store/GameStore.js';
import PuzzleRepository from './PuzzleRepository.js';
import PuzzleCollectionRepository from './PuzzleCollectionRepository.js';
import { serializePuzzleData } from './puzzleSerializer.js';
import { mustBeCollectionAuthor, mustBePuzzleAuthor } from './puzzleGuards.js';
import PlayerModerationActionRepository from '../repositories/PlayerModerationActionRepository.js';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, Max, Min, Validate } from 'class-validator';
import type { Move } from '@playhex/move-notation';
import { PUZZLE_CHECK_ENGINES, type PuzzleCheckEngine, type PuzzleCheckInput, type PuzzleCheckState, type PuzzleSolvePositionInput, type PuzzleSolvePositionOutput } from '../../shared/app/puzzles/puzzleCheck.js';
import { MIN_BOARDSIZE, MOHEX_MAX_BOARDSIZE } from '../../shared/app/boardsizeLimits.js';
import { IsHexCoordinate } from '../../shared/app/validator/IsHexCoordinate.js';
import PositionSolveCache from '../ai-jobs/PositionSolveCache.js';
import AiJobService, { SOLVE_POSITION_INTERACTIVE_TIMEOUT_MS } from '../ai-jobs/AiJobService.js';
import { getPuzzleSolveInputs, solvePuzzlePosition } from './solvePuzzlePosition.js';
import { fillDisabledCells, toColor } from './puzzleCheckUtils.js';
import PuzzleCheckService, { getPuzzleCheckKey } from './PuzzleCheckService.js';
import { SimilarPlayingPositionChecker } from '../services/anti-cheat/SimilarPlayingPositionChecker.js';
import { SimilarPositionDetectedError, similarPositionDetectedToTranslatableHttpError } from '../services/anti-cheat/SimilarPositionDetectedError.js';
import { InvalidPositionError } from '../../shared/position-comparator/position-comparator.js';
import { rateLimiterConsumePuzzleCheck, rateLimiterConsumePuzzleSolvePosition } from '../services/rate-limiters.js';
import { ROLE_ADMIN } from '../services/roles.js';

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

type PuzzleCollectionState = Pick<Puzzle, 'collection' | 'published'>;

/**
 * Collections to mark as updated after puzzle changed collection or has been (un)published.
 * Only published puzzles are visible in collection, so a draft moving does not update them.
 *
 * @param previous Puzzle collection and published state before changes
 */
const collectionsVisiblyUpdated = (puzzle: Puzzle, previous: PuzzleCollectionState): PuzzleCollection[] => {
    const moved = previous.collection?.id !== puzzle.collection?.id;
    const collections: PuzzleCollection[] = [];

    if (previous.collection !== null && previous.published && (moved || !puzzle.published)) {
        collections.push(previous.collection);
    }

    if (puzzle.collection !== null && puzzle.published && (moved || !previous.published)) {
        collections.push(puzzle.collection);
    }

    return collections;
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
    puzzle.updatedAt = new Date();
    mustBeSavable(puzzle);
};

const SOLVE_MAX_STONES = MOHEX_MAX_BOARDSIZE * MOHEX_MAX_BOARDSIZE;

class SolvePositionBody implements PuzzleSolvePositionInput
{
    @IsInt()
    @Min(MIN_BOARDSIZE)
    @Max(MOHEX_MAX_BOARDSIZE)
    size: number;

    @IsIn(['black', 'white'])
    color: 'black' | 'white';

    @IsArray()
    @ArrayMaxSize(SOLVE_MAX_STONES)
    @Validate(IsHexCoordinate, { each: true })
    black: Move[];

    @IsArray()
    @ArrayMaxSize(SOLVE_MAX_STONES)
    @Validate(IsHexCoordinate, { each: true })
    white: Move[];

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(SOLVE_MAX_STONES)
    @Validate(IsHexCoordinate, { each: true })
    disabledCells?: Move[];
}

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
        private puzzleCollectionRepository: PuzzleCollectionRepository,
        private gameStore: GameStore,
        private playerModerationActionRepository: PlayerModerationActionRepository,
        private puzzleCheckService: PuzzleCheckService,
        private similarPlayingPositionChecker: SimilarPlayingPositionChecker,
        private positionSolveCache: PositionSolveCache,
        private aiJobService: AiJobService,
    ) {}

    /**
     * Returns current check state, or starts it.
     * Client polls by sending same input again until check is done.
     *
     * @param beforeStart Called only when a new check is started
     *
     * @throws {BadRequestError} If puzzle is not valid
     * @throws {HttpError} 503 if engine is not available
     */
    private async puzzleCheck(input: PuzzleCheckInput, beforeStart: (engine: PuzzleCheckEngine) => Promise<void>): Promise<PuzzleCheckState>
    {
        const engine = input.engine ?? 'katahex-intuition';

        if (!PUZZLE_CHECK_ENGINES.includes(engine)) {
            throw new BadRequestError(`Invalid engine "${String(engine)}"`);
        }

        const errors = validatePuzzle(input.puzzle);

        if (errors.length > 0) {
            throw new BadRequestError(`Invalid puzzle: ${errors.map(puzzleErrorToString).join(', ')}`);
        }

        if (engine === 'mohex-solver' && input.puzzle.boardsize > MOHEX_MAX_BOARDSIZE) {
            throw new BadRequestError(`Solver supports boards up to ${MOHEX_MAX_BOARDSIZE}`);
        }

        const state = this.puzzleCheckService.getState(getPuzzleCheckKey(input.puzzle, engine));

        if (state !== null) {
            return state;
        }

        if (!this.puzzleCheckService.isEngineAvailable(engine)) {
            throw new HttpError(503, 'No AI worker can analyze positions right now');
        }

        await beforeStart(engine);

        return this.puzzleCheckService.start(input.puzzle, engine);
    }

    /**
     * Moves puzzle to input collection, at the end, if collection changed.
     * Keeps current collection if input has no collectionPublicId.
     *
     * @throws {NotFoundError} If collection not found
     * @throws {HttpError} If player is not the collection author
     * @throws {BadRequestError} If collection is full
     */
    private async applyCollectionInput(puzzle: Puzzle, player: Player, input: PuzzleInput): Promise<void>
    {
        const { collectionPublicId } = input;

        if (collectionPublicId === undefined || collectionPublicId === (puzzle.collection?.publicId ?? null)) {
            return;
        }

        let collection: null | PuzzleCollection = null;
        let position: null | number = null;

        if (collectionPublicId !== null) {
            collection = await this.puzzleCollectionRepository.findByPublicId(collectionPublicId);

            if (collection === null) {
                throw new NotFoundError(`Puzzle collection "${collectionPublicId}" not found`);
            }

            mustBeCollectionAuthor(collection, player);

            const { count, nextPosition } = await this.puzzleRepository.getCollectionFilling(collection);

            if (count >= PUZZLE_COLLECTION_MAX_PUZZLES) {
                throw new BadRequestError(`A collection can have at most ${PUZZLE_COLLECTION_MAX_PUZZLES} puzzles`);
            }

            position = nextPosition;
        }

        puzzle.collection = collection;
        puzzle.collectionPosition = position;
    }

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
        return serializePuzzleData(await this.puzzleRepository.findPublishedForList());
    }

    @Get('/api/puzzles/mine')
    async getMyPuzzles(
        @AuthenticatedPlayer() player: Player,
    ) {
        return serializePuzzleData(await this.puzzleRepository.findByAuthor(player));
    }

    @Get('/api/puzzles/:publicId')
    async getPuzzle(
        @Param('publicId') publicId: string,
    ) {
        const puzzle = await this.getPuzzleOrFail(publicId);

        return serializePuzzleData(puzzle);
    }

    /**
     * Next puzzle to play once this one is finished, see PuzzleRepository.findNextPuzzle()
     *
     * @returns Next puzzle publicId and title, or null if none
     */
    @Get('/api/puzzles/:publicId/next')
    async getNextPuzzle(
        @Param('publicId') publicId: string,
    ) {
        const puzzle = await this.getPuzzleOrFail(publicId);
        const next = await this.puzzleRepository.findNextPuzzle(puzzle);

        return next === null ? null : serializePuzzleData(next);
    }

    @Post('/api/puzzles')
    async postPuzzle(
        @AuthenticatedPlayer() player: Player,
        @Body(BODY_OPTIONS) input: PuzzleInput,
    ) {
        await this.playerModerationActionRepository.mustNotBeContentRestricted(player);

        const puzzle = new Puzzle();

        puzzle.publicId = uuidv4();
        puzzle.author = player;
        puzzle.game = null;
        puzzle.publishedAt = null;
        puzzle.collection = null;
        puzzle.collectionPosition = null;

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
        await this.applyCollectionInput(puzzle, player, input);

        await this.puzzleRepository.save(puzzle, collectionsVisiblyUpdated(puzzle, { collection: null, published: false }));

        return serializePuzzleData(puzzle);
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
        await this.playerModerationActionRepository.mustNotBeContentRestricted(player);
        const previous: PuzzleCollectionState = { collection: puzzle.collection, published: puzzle.published };
        setPublished(puzzle, true);
        puzzle.updatedAt = new Date();
        mustBeSavable(puzzle);

        await this.puzzleRepository.save(puzzle, collectionsVisiblyUpdated(puzzle, previous));

        return serializePuzzleData(puzzle);
    }

    @Put('/api/puzzles/:publicId')
    async putPuzzle(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Body(BODY_OPTIONS) input: PuzzleInput,
    ) {
        const puzzle = await this.getPuzzleOrFail(publicId);

        mustBePuzzleAuthor(puzzle, player);
        await this.playerModerationActionRepository.mustNotBeContentRestricted(player);
        const previous: PuzzleCollectionState = { collection: puzzle.collection, published: puzzle.published };
        applyPuzzleInput(puzzle, input);
        await this.applyCollectionInput(puzzle, player, input);

        await this.puzzleRepository.save(puzzle, collectionsVisiblyUpdated(puzzle, previous));

        return serializePuzzleData(puzzle);
    }

    /**
     * Checks puzzle tree with katahex or Mohex solver, see PuzzleKatahexChecker and PuzzleSolverChecker.
     * Puzzle is sent, not saved, to check it while editing.
     */
    @Post('/api/puzzles/katahex-check')
    async postPuzzleCheck(
        @AuthenticatedPlayer() player: Player,
        @Body(BODY_OPTIONS) input: PuzzleCheckInput,
        @Req() request: Request,
    ): Promise<PuzzleCheckState> {
        return await this.puzzleCheck(input, async engine => {
            const { boardsize, redStones, blueStones, playerColor, disabledCells = [] } = input.puzzle;

            // Solver sees disabled cells as stones, see fillDisabledCells(): check positions it actually solves
            const positions = engine === 'mohex-solver'
                ? [
                    fillDisabledCells(redStones, blueStones, disabledCells, toColor(playerColor), 'win'),
                    fillDisabledCells(redStones, blueStones, disabledCells, toColor(playerColor), 'notWin'),
                ]
                : [{ black: redStones, white: blueStones }]
            ;

            this.mustNotBePlayingPositions(boardsize, positions, player, request);

            await rateLimiterConsumePuzzleCheck(player.publicId);
        });
    }

    /**
     * Prevent getting AI help on a playing game position, like Hexplorer.
     * Positions must be the ones sent to AI.
     *
     * @throws {BadRequestError} If a position is invalid (cell occupied twice, out of board...)
     * @throws {HttpError} If a position is similar to a playing game one
     */
    private mustNotBePlayingPositions(boardsize: number, positions: { black: Move[], white: Move[] }[], player: Player, request: Request): void
    {
        try {
            for (const { black, white } of positions) {
                this.similarPlayingPositionChecker.checkPosition({ boardsize, black, white });
            }
        } catch (e) {
            if (e instanceof InvalidPositionError) {
                throw new BadRequestError(e.message);
            }

            if (e instanceof SimilarPositionDetectedError) {
                void this.similarPlayingPositionChecker.flag(e, {
                    context: 'puzzle_check',
                    playerPublicId: player.publicId,
                    ip: request.ip ?? null,
                });

                throw similarPositionDetectedToTranslatableHttpError(e);
            }

            throw e;
        }
    }

    /**
     * Solves a position from puzzle editor with Mohex solver, and each move of player to move.
     * Disabled cells are taken into account, see solvePuzzlePosition().
     */
    @Post('/api/puzzles/solve-position')
    async postSolvePosition(
        @AuthenticatedPlayer() player: Player,
        @Body() body: SolvePositionBody,
        @Req() request: Request,
    ): Promise<PuzzleSolvePositionOutput> {
        const inputs = getPuzzleSolveInputs(body);

        // Disabled cells are filled with stones: checks positions actually solved, and validates all cells
        this.mustNotBePlayingPositions(body.size, [inputs.win, inputs.notWin], player, request);

        const cached = (await Promise.all([
            this.positionSolveCache.isCached(inputs.win),
            this.positionSolveCache.isCached(inputs.notWin),
        ])).every(Boolean);

        if (!cached) {
            if (!this.aiJobService.isSolverAvailable()) {
                throw new HttpError(503, 'No AI worker can solve positions right now');
            }

            await rateLimiterConsumePuzzleSolvePosition(player.publicId);
        }

        return await solvePuzzlePosition(body, input => this.positionSolveCache.solve(input, SOLVE_POSITION_INTERACTIVE_TIMEOUT_MS));
    }

    /**
     * Same as postPuzzleCheck(), for admin, used by command "puzzle-validate".
     */
    @Authorized(ROLE_ADMIN)
    @Post('/api/admin/puzzles/katahex-check')
    async postAdminPuzzleCheck(
        @Body(BODY_OPTIONS) input: PuzzleCheckInput,
    ): Promise<PuzzleCheckState> {
        return await this.puzzleCheck(input, async () => {});
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
