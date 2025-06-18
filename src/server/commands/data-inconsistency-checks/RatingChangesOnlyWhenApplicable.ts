import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { HostedGame } from '../../../shared/app/models/index.js';
import { DataInconsistenciesCheckerInterface } from './DataInconsistenciesCheckerInterface.js';

@Service()
export class RatingChangesOnlyWhenApplicable implements DataInconsistenciesCheckerInterface
{
    constructor(
        @Inject('Repository<HostedGame>')
        private hostedGameRepository: Repository<HostedGame>,
    ) {}

    getDescription(): string
    {
        return 'There can be rating changes only for games ranked, not canceled';
    }

    async run(): Promise<string[]>
    {
        type Result = {
            hostedGame_publicId: string;
            hostedGame_createdAt: Date;
        };

        const canceled: Result[] = await this.hostedGameRepository
            .createQueryBuilder('hostedGame')
            .innerJoin('hostedGame.ratings', 'rating')
            .where('hostedGame.state = "canceled"')
            .groupBy('hostedGame.id')
            .execute()
        ;

        const unrated: Result[] = await this.hostedGameRepository
            .createQueryBuilder('hostedGame')
            .innerJoin('hostedGame.gameOptions', 'gameOptions')
            .innerJoin('hostedGame.ratings', 'rating')
            .where('not gameOptions.ranked')
            .groupBy('hostedGame.id')
            .execute()
        ;

        const missingRating: Result[] = await this.hostedGameRepository.query(`
            select hg.publicId as hostedGame_publicId, hg.createdAt as hostedGame_createdAt
            from hosted_game_options hgo
            inner join hosted_game hg on hg.id = hgo.hostedgameid
            left join rating_games_hosted_game r on hgo.hostedgameid = r.hostedgameid
            where ranked
            and r.hostedgameid is null
            and hg.state in ('ended', 'forfeited')
        `);

        const hostedGameToString = (label: string, hostedGame: Result) => [
            label,
            hostedGame.hostedGame_publicId,
            hostedGame.hostedGame_createdAt,
        ].join(' ');

        return [
            ...canceled.map(hostedGame => hostedGameToString('canceled but rated', hostedGame)),
            ...unrated.map(hostedGame => hostedGameToString('unrated in options but having ratings', hostedGame)),
            ...missingRating.map(hostedGame => hostedGameToString('rated in options but no ratings', hostedGame)),
        ];
    }
}
