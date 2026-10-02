import { Inject, Service } from 'typedi';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Player, Puzzle } from '../../shared/app/models/index.js';

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
                'puzzle.lastMove',
                'puzzle.playerColor',
                'puzzle.published',
                'puzzle.publishedAt',
                'puzzle.createdAt',
            ])
            .leftJoinAndSelect('puzzle.author', 'author')
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
            .getMany()
        ;
    }

    /**
     * Unpublished puzzles of this author, most recent first.
     */
    async findUnpublishedByAuthor(author: Player): Promise<Puzzle[]>
    {
        return await this.createListQueryBuilder()
            .where('puzzle.published = false')
            .andWhere('author.id = :authorId', { authorId: author.id })
            .orderBy('puzzle.createdAt', 'DESC')
            .getMany()
        ;
    }

    async save(puzzle: Puzzle): Promise<Puzzle>
    {
        return await this.puzzleRepository.save(puzzle);
    }

    async remove(puzzle: Puzzle): Promise<void>
    {
        await this.puzzleRepository.remove(puzzle);
    }
}
