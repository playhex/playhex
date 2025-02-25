import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { HostedGame } from '../../../shared/app/models';
import { DataInconsistenciesCheckerInterface } from './DataInconsistenciesCheckerInterface';

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

        const unranked: Result[] = await this.hostedGameRepository
            .createQueryBuilder('hostedGame')
            .innerJoin('hostedGame.gameOptions', 'gameOptions')
            .innerJoin('hostedGame.ratings', 'rating')
            .where('not gameOptions.ranked')
            .groupBy('hostedGame.id')
            .execute()
        ;

        const hostedGameToString = (label: string, hostedGame: Result) => [
            label,
            hostedGame.hostedGame_publicId,
            hostedGame.hostedGame_createdAt,
        ].join(' ');

        return [
            ...canceled.map(hostedGame => hostedGameToString('canceled but ranked', hostedGame)),
            ...unranked.map(hostedGame => hostedGameToString('unranked but ranked', hostedGame)),
        ];
    }
}
