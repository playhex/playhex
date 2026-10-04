import { BadRequestError, Body, CurrentUser, Delete, Get, HttpError, JsonController, NotFoundError, OnUndefined, Param, Post, Put } from 'routing-controllers';
import { Service } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedPlayer } from '../controllers/http/middlewares.js';
import { Player, PuzzleCollection } from '../../shared/app/models/index.js';
import { normalizePuzzleCollectionInput, PUZZLE_COLLECTION_MAX_PUZZLES, validatePuzzleCollectionInput, type PuzzleCollectionInput } from '../../shared/app/puzzles/puzzleCollection.js';
import PuzzleCollectionRepository from './PuzzleCollectionRepository.js';
import PuzzleRepository from './PuzzleRepository.js';
import { serializePuzzleData } from './puzzleSerializer.js';
import { mustBeCollectionAuthor } from './puzzleGuards.js';

/**
 * Copies input to collection, then checks it.
 *
 * @throws {BadRequestError} If input is invalid
 */
const applyCollectionInput = (collection: PuzzleCollection, input: PuzzleCollectionInput): void => {
    const errors = validatePuzzleCollectionInput(input);

    if (errors.length > 0) {
        throw new BadRequestError(`Invalid collection: ${errors.join(', ')}`);
    }

    const { name, description } = normalizePuzzleCollectionInput(input);

    collection.name = name;
    collection.description = description;
    collection.updatedAt = new Date();
};

@JsonController()
@Service()
export default class PuzzleCollectionController
{
    constructor(
        private puzzleCollectionRepository: PuzzleCollectionRepository,
        private puzzleRepository: PuzzleRepository,
    ) {}

    /**
     * @throws {NotFoundError}
     */
    private async getCollectionOrFail(publicId: string): Promise<PuzzleCollection>
    {
        const collection = await this.puzzleCollectionRepository.findByPublicId(publicId);

        if (collection === null) {
            throw new NotFoundError('Puzzle collection not found');
        }

        return collection;
    }

    @Get('/api/puzzle-collections')
    async getCollections()
    {
        return serializePuzzleData(await this.puzzleCollectionRepository.findForList());
    }

    @Get('/api/puzzle-collections/mine')
    async getMyCollections(
        @AuthenticatedPlayer() player: Player,
    ) {
        return serializePuzzleData(await this.puzzleCollectionRepository.findByAuthor(player));
    }

    /**
     * Collection and its puzzles, in order.
     * Author also gets unpublished puzzles.
     */
    @Get('/api/puzzle-collections/:publicId')
    async getCollection(
        @CurrentUser() player: undefined | null | Player,
        @Param('publicId') publicId: string,
    ) {
        const collection = await this.getCollectionOrFail(publicId);
        const isAuthor = !!player && collection.author?.publicId === player.publicId;

        return {
            collection: serializePuzzleData(collection),
            puzzles: serializePuzzleData(await this.puzzleRepository.findByCollection(collection, isAuthor)),
        };
    }

    @Post('/api/puzzle-collections')
    async postCollection(
        @AuthenticatedPlayer() player: Player,
        @Body({ required: true }) input: PuzzleCollectionInput,
    ) {
        const collection = new PuzzleCollection();

        collection.publicId = uuidv4();
        collection.author = player;
        collection.createdAt = new Date();
        applyCollectionInput(collection, input);

        await this.puzzleCollectionRepository.save(collection);

        return serializePuzzleData(collection);
    }

    @Put('/api/puzzle-collections/:publicId')
    async putCollection(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Body({ required: true }) input: PuzzleCollectionInput,
    ) {
        const collection = await this.getCollectionOrFail(publicId);

        mustBeCollectionAuthor(collection, player);
        applyCollectionInput(collection, input);

        await this.puzzleCollectionRepository.save(collection);

        return serializePuzzleData(collection);
    }

    /**
     * Sets puzzles of this collection, in this order: used to add, remove and reorder puzzles.
     * Only puzzles of collection author can be added.
     */
    @Put('/api/puzzle-collections/:publicId/puzzles')
    @OnUndefined(204)
    async putCollectionPuzzles(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Body({ required: true }) { puzzlePublicIds }: { puzzlePublicIds: string[] },
    ): Promise<void> {
        const collection = await this.getCollectionOrFail(publicId);

        mustBeCollectionAuthor(collection, player);

        if (!Array.isArray(puzzlePublicIds) || puzzlePublicIds.some(id => typeof id !== 'string')) {
            throw new BadRequestError('puzzlePublicIds must be a list of strings');
        }

        if (puzzlePublicIds.length > PUZZLE_COLLECTION_MAX_PUZZLES) {
            throw new BadRequestError(`A collection can have at most ${PUZZLE_COLLECTION_MAX_PUZZLES} puzzles`);
        }

        if (new Set(puzzlePublicIds).size !== puzzlePublicIds.length) {
            throw new BadRequestError('puzzlePublicIds must not contain duplicates');
        }

        const puzzles = await this.puzzleRepository.findByPublicIds(puzzlePublicIds);

        if (puzzles.length !== puzzlePublicIds.length) {
            throw new NotFoundError('Puzzle not found');
        }

        if (puzzles.some(puzzle => puzzle.author?.publicId !== player.publicId)) {
            throw new HttpError(403, 'Only your own puzzles can be added to your collection');
        }

        const puzzlesByPublicId = new Map(puzzles.map(puzzle => [puzzle.publicId, puzzle]));

        await this.puzzleRepository.setCollectionPuzzles(
            collection,
            puzzlePublicIds.map(id => puzzlesByPublicId.get(id)!),
        );
    }

    /**
     * Puzzles are kept, without collection.
     */
    @Delete('/api/puzzle-collections/:publicId')
    @OnUndefined(204)
    async deleteCollection(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
    ): Promise<void> {
        const collection = await this.getCollectionOrFail(publicId);

        mustBeCollectionAuthor(collection, player);

        await this.puzzleCollectionRepository.remove(collection);
    }
}
