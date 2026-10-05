import { Inject, Service } from 'typedi';
import { Brackets, EntityManager, In, Repository, SelectQueryBuilder } from 'typeorm';
import { Player, Puzzle, PuzzleCollection } from '../../shared/app/models/index.js';

/**
 * Marks these collections as updated, e.g when puzzles are added, moved or removed.
 */
const touchCollections = async (manager: EntityManager, collections: PuzzleCollection[]): Promise<void> => {
    if (collections.length === 0) {
        return;
    }

    await manager.update(
        PuzzleCollection,
        { id: In([...new Set(collections.map(collection => collection.id))]) },
        { updatedAt: new Date() },
    );
};

@Service()
export default class PuzzleRepository
{
    constructor(
        @Inject('Repository<Puzzle>')
        private puzzleRepository: Repository<Puzzle>,
    ) {}

    /**
     * With author, and game publicId, players and date only.
     */
    async findPuzzleByPublicId(publicId: string): Promise<null | Puzzle>
    {
        return await this.puzzleRepository.createQueryBuilder('puzzle')
            .leftJoinAndSelect('puzzle.author', 'author')
            .leftJoin('puzzle.game', 'game')
            .addSelect(['game.id', 'game.publicId', 'game.createdAt', 'game.startedAt'])
            .leftJoin('game.gameToPlayers', 'gameToPlayer')
            .addSelect(['gameToPlayer.gameId', 'gameToPlayer.order'])
            .leftJoinAndSelect('gameToPlayer.player', 'gamePlayer')
            .leftJoinAndSelect('puzzle.collection', 'collection')
            .where('puzzle.publicId = :publicId', { publicId })
            .getOne()
        ;
    }

    /**
     * Without tree, only what is needed to display puzzles in a list, with a thumbnail.
     */
    private createListQueryBuilder(): SelectQueryBuilder<Puzzle>
    {
        return this.puzzleRepository.createQueryBuilder('puzzle')
            .select([
                'puzzle.id',
                'puzzle.publicId',
                'puzzle.title',
                'puzzle.boardsize',
                'puzzle.redStones',
                'puzzle.blueStones',
                'puzzle.disabledCells',
                'puzzle.lastMove',
                'puzzle.playerColor',
                'puzzle.published',
                'puzzle.publishedAt',
                'puzzle.createdAt',
                'puzzle.collectionPosition',
            ])
            .leftJoinAndSelect('puzzle.author', 'author')
            .leftJoin('puzzle.collection', 'collection')
            .addSelect(['collection.id', 'collection.publicId', 'collection.name'])
        ;
    }

    /**
     * Published puzzles, most recently published first.
     */
    async findPublishedForList(): Promise<Puzzle[]>
    {
        return await this.createListQueryBuilder()
            .where('puzzle.published = true')
            .orderBy('puzzle.publishedAt', 'DESC')
            .addOrderBy('puzzle.id', 'DESC') // same order as findNextPuzzle()
            .getMany()
        ;
    }

    /**
     * Published and unpublished puzzles of this author, most recent first.
     */
    async findByAuthor(author: Player): Promise<Puzzle[]>
    {
        return await this.createListQueryBuilder()
            .where('author.id = :authorId', { authorId: author.id })
            .orderBy('puzzle.createdAt', 'DESC')
            .getMany()
        ;
    }

    /**
     * Puzzles of this collection, in collection order.
     *
     * @param includeDrafts Whether unpublished puzzles are also returned, for collection author
     */
    async findByCollection(collection: PuzzleCollection, includeDrafts: boolean): Promise<Puzzle[]>
    {
        const queryBuilder = this.createListQueryBuilder()
            .where('collection.id = :collectionId', { collectionId: collection.id })
            .orderBy('puzzle.collectionPosition', 'ASC')
        ;

        if (!includeDrafts) {
            queryBuilder.andWhere('puzzle.published = true');
        }

        return await queryBuilder.getMany();
    }

    /**
     * Puzzles with these public ids, with author and collection.
     */
    async findByPublicIds(publicIds: string[]): Promise<Puzzle[]>
    {
        if (publicIds.length === 0) {
            return [];
        }

        return await this.createListQueryBuilder()
            .where('puzzle.publicId in (:...publicIds)', { publicIds })
            .getMany()
        ;
    }

    /**
     * Next published puzzle to play after this one:
     * next one in collection order if puzzle is in a collection,
     * else next one in puzzles list (older).
     *
     * @returns Light puzzle with publicId and title, or null if this is the last one
     */
    async findNextPuzzle(puzzle: Puzzle): Promise<null | Puzzle>
    {
        const queryBuilder = this.puzzleRepository.createQueryBuilder('puzzle')
            .select(['puzzle.id', 'puzzle.publicId', 'puzzle.title'])
            .where('puzzle.published = true')
        ;

        if (puzzle.collection) {
            queryBuilder
                .andWhere('puzzle.collection = :collectionId', { collectionId: puzzle.collection.id })
                .andWhere('puzzle.collectionPosition > :position', { position: puzzle.collectionPosition })
                .orderBy('puzzle.collectionPosition', 'ASC')
            ;
        } else {
            if (puzzle.publishedAt === null) {
                return null;
            }

            // Same order as findPublishedForList(), id breaks ties as publishedAt has second precision
            queryBuilder
                .andWhere(new Brackets(qb => qb
                    .where('puzzle.publishedAt < :publishedAt')
                    .orWhere('puzzle.publishedAt = :publishedAt and puzzle.id < :id'),
                ), { publishedAt: puzzle.publishedAt, id: puzzle.id })
                .orderBy('puzzle.publishedAt', 'DESC')
                .addOrderBy('puzzle.id', 'DESC')
            ;
        }

        return await queryBuilder.getOne();
    }

    /**
     * Puzzles count in this collection, drafts included,
     * and position to put a puzzle at the end of this collection.
     */
    async getCollectionFilling(collection: PuzzleCollection): Promise<{ count: number, nextPosition: number }>
    {
        const result = await this.puzzleRepository.createQueryBuilder('puzzle')
            .select('count(*)', 'count')
            .addSelect('max(puzzle.collectionPosition)', 'maxPosition')
            .where('puzzle.collection = :collectionId', { collectionId: collection.id })
            .getRawOne<{ count: number | string, maxPosition: null | number | string }>()
        ;

        const maxPosition = result?.maxPosition ?? null;

        return {
            count: Number(result?.count ?? 0),
            nextPosition: maxPosition === null ? 0 : Number(maxPosition) + 1,
        };
    }

    /**
     * Replaces puzzles of a collection, in this order.
     * Puzzles no longer listed are removed from collection.
     * Puzzles listed are moved from their previous collection if any.
     * Collections are marked as updated only if their published puzzles changed,
     * as drafts are not visible.
     *
     * @param puzzles With their current collection and published state
     */
    async setCollectionPuzzles(collection: PuzzleCollection, puzzles: Puzzle[]): Promise<void>
    {
        const publishedIds = (list: Pick<Puzzle, 'id' | 'published'>[]): string =>
            list.filter(puzzle => puzzle.published).map(puzzle => puzzle.id).join(',');

        await this.puzzleRepository.manager.transaction(async manager => {
            const previousPuzzles = await manager.find(Puzzle, {
                select: { id: true, published: true },
                where: { collection: { id: collection.id } },
                order: { collectionPosition: 'ASC' },
            });

            await manager.update(Puzzle, { collection: { id: collection.id } }, { collection: null, collectionPosition: null });

            for (const [position, puzzle] of puzzles.entries()) {
                await manager.update(Puzzle, { id: puzzle.id }, { collection: { id: collection.id }, collectionPosition: position });
            }

            await touchCollections(manager, [
                ...(publishedIds(previousPuzzles) !== publishedIds(puzzles) ? [collection] : []),
                ...puzzles
                    .filter(puzzle => puzzle.published && puzzle.collection !== null && puzzle.collection.id !== collection.id)
                    .map(puzzle => puzzle.collection!),
            ]);
        });
    }

    /**
     * @param updatedCollections Collections puzzle has been added to or removed from, to mark them as updated
     */
    async save(puzzle: Puzzle, updatedCollections: PuzzleCollection[] = []): Promise<Puzzle>
    {
        return await this.puzzleRepository.manager.transaction(async manager => {
            await touchCollections(manager, updatedCollections);

            return await manager.save(puzzle);
        });
    }

    /**
     * Last created or updated puzzles, drafts included as they are accessible by their link,
     * with tree, author and collection. Most recently updated first.
     */
    async findLastUpdatedForModeration(limit = 100): Promise<Puzzle[]>
    {
        return await this.puzzleRepository.find({
            relations: { author: true, collection: true },
            order: { updatedAt: 'DESC', id: 'DESC' },
            take: limit,
        });
    }

    /**
     * Puts back a puzzle as draft, without changing its updatedAt date.
     * Also marks its collection as updated, if any and puzzle was visible in it.
     */
    async unpublish(puzzle: Puzzle): Promise<void>
    {
        await this.puzzleRepository.manager.transaction(async manager => {
            await touchCollections(manager, puzzle.collection && puzzle.published ? [puzzle.collection] : []);
            await manager.update(Puzzle, { id: puzzle.id }, { published: false });
        });

        puzzle.published = false;
    }

    /**
     * Also marks its collection as updated, if any and puzzle was visible in it.
     */
    async remove(puzzle: Puzzle): Promise<void>
    {
        await this.puzzleRepository.manager.transaction(async manager => {
            await touchCollections(manager, puzzle.collection && puzzle.published ? [puzzle.collection] : []);
            await manager.remove(puzzle);
        });
    }
}
