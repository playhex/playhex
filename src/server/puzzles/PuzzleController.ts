import { BadRequestError, Body, Delete, Get, HttpError, JsonController, NotFoundError, OnUndefined, Param, Post, Put } from 'routing-controllers';
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
    ) {}

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
