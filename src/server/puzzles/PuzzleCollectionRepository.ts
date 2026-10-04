import { Inject, Service } from 'typedi';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Player, Puzzle, PuzzleCollection } from '../../shared/app/models/index.js';

@Service()
export default class PuzzleCollectionRepository
{
    constructor(
        @Inject('Repository<PuzzleCollection>')
        private puzzleCollectionRepository: Repository<PuzzleCollection>,
    ) {}

    private createQueryBuilder(): SelectQueryBuilder<PuzzleCollection>
    {
        return this.puzzleCollectionRepository.createQueryBuilder('collection')
            .leftJoinAndSelect('collection.author', 'author')
        ;
    }

    /**
     * Sets puzzlesCount on each collection, in one query.
     *
     * @param includeDrafts Whether unpublished puzzles are also counted, for collection author
     */
    private async loadPuzzlesCount(collections: PuzzleCollection[], includeDrafts: boolean): Promise<PuzzleCollection[]>
    {
        if (collections.length === 0) {
            return collections;
        }

        const queryBuilder = this.puzzleCollectionRepository.manager.createQueryBuilder(Puzzle, 'puzzle')
            .select('puzzle.collection', 'collectionId')
            .addSelect('count(*)', 'count')
            .where('puzzle.collection in (:...collectionIds)', { collectionIds: collections.map(collection => collection.id) })
            .groupBy('puzzle.collection')
        ;

        if (!includeDrafts) {
            queryBuilder.andWhere('puzzle.published = true');
        }

        const rows = await queryBuilder.getRawMany<{ collectionId: number | string, count: number | string }>();
        const counts = new Map(rows.map(row => [Number(row.collectionId), Number(row.count)]));

        for (const collection of collections) {
            collection.puzzlesCount = counts.get(collection.id) ?? 0;
        }

        return collections;
    }

    /**
     * With author.
     */
    async findByPublicId(publicId: string): Promise<null | PuzzleCollection>
    {
        return await this.createQueryBuilder()
            .where('collection.publicId = :publicId', { publicId })
            .getOne()
        ;
    }

    /**
     * Collections having at least one published puzzle, most recently updated first.
     * Drafts are not counted.
     */
    async findForList(): Promise<PuzzleCollection[]>
    {
        const collections = await this.createQueryBuilder()
            .where(qb => 'exists ' + qb.subQuery()
                .select('1')
                .from(Puzzle, 'listedPuzzle')
                .where('listedPuzzle.collection = collection.id')
                .andWhere('listedPuzzle.published = true')
                .getQuery(),
            )
            .orderBy('collection.updatedAt', 'DESC')
            .getMany()
        ;

        return await this.loadPuzzlesCount(collections, false);
    }

    /**
     * All collections of this author, even empty ones, most recently updated first.
     * Drafts are counted.
     */
    async findByAuthor(author: Player): Promise<PuzzleCollection[]>
    {
        const collections = await this.createQueryBuilder()
            .where('author.id = :authorId', { authorId: author.id })
            .orderBy('collection.updatedAt', 'DESC')
            .getMany()
        ;

        return await this.loadPuzzlesCount(collections, true);
    }

    async save(collection: PuzzleCollection): Promise<PuzzleCollection>
    {
        return await this.puzzleCollectionRepository.save(collection);
    }

    /**
     * Puzzles are kept, without collection.
     */
    async remove(collection: PuzzleCollection): Promise<void>
    {
        await this.puzzleCollectionRepository.manager.transaction(async manager => {
            await manager.update(Puzzle, { collection: { id: collection.id } }, { collection: null, collectionPosition: null });
            await manager.remove(collection);
        });
    }
}
