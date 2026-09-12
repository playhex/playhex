import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Game } from '../../../shared/app/models/index.js';
import { DataInconsistenciesCheckerInterface } from './DataInconsistenciesCheckerInterface.js';

@Service()
export class RatingChangesOnlyWhenApplicable implements DataInconsistenciesCheckerInterface
{
    constructor(
        @Inject('Repository<Game>')
        private gameRepository: Repository<Game>,
    ) {}

    getDescription(): string
    {
        return 'There can be rating changes only for games ranked, not canceled';
    }

    async run(): Promise<string[]>
    {
        type Result = {
            game_publicId: string;
            game_createdAt: Date;
        };

        const canceled: Result[] = await this.gameRepository
            .createQueryBuilder('game')
            .innerJoin('game.ratings', 'rating')
            .where('game.state = "canceled"')
            .groupBy('game.id')
            .execute()
        ;

        const unrated: Result[] = await this.gameRepository
            .createQueryBuilder('game')
            .innerJoin('game.ratings', 'rating')
            .where('not game.ranked')
            .groupBy('game.id')
            .execute()
        ;

        const missingRating: Result[] = await this.gameRepository.query(`
            select g.publicId as game_publicId, g.createdAt as game_createdAt
            from game g
            left join rating_games_game r on g.id = r.gameId
            where g.ranked
            and r.gameId is null
            and g.state in ('ended', 'forfeited')
        `);

        const gameToString = (label: string, game: Result) => [
            label,
            game.game_publicId,
            game.game_createdAt,
        ].join(' ');

        return [
            ...canceled.map(game => gameToString('canceled but rated', game)),
            ...unrated.map(game => gameToString('unrated in options but having ratings', game)),
            ...missingRating.map(game => gameToString('rated in options but no ratings', game)),
        ];
    }
}
