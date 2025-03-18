import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { HostedGame } from '../../../shared/app/models/index.js';
import { DataInconsistenciesCheckerInterface } from './DataInconsistenciesCheckerInterface.js';

/**
 * When a game timeouts but at least one players didn't made a move,
 * assume this player wasn't aware of the game, and the game must be canceled
 * instead of giving victory to the first player.
 */
@Service()
export class GamesWithAIMustHaveOpponentId implements DataInconsistenciesCheckerInterface
{
    constructor(
        @Inject('Repository<HostedGame>')
        private hostedGameRepository: Repository<HostedGame>,
    ) {}

    getDescription(): string
    {
        return 'Bot games must have an opponentPublicId';
    }

    async run(): Promise<string[]>
    {
        type Result = {
            hostedGame_publicId: string;
            hostedGame_createdAt: Date;
        };

        const missingAiPublicId: Result[] = await this.hostedGameRepository
            .createQueryBuilder('hostedGame')
            .innerJoin('hostedGame.gameOptions', 'gameOptions')
            .where('gameOptions.opponentType = "ai"')
            .andWhere('gameOptions.opponentPublicId is null')
            .execute()
        ;

        const hostedGameToString = (hostedGame: Result) => [
            hostedGame.hostedGame_publicId,
            hostedGame.hostedGame_createdAt,
        ].join(' ');

        return missingAiPublicId.map(hostedGame => hostedGameToString(hostedGame));
    }
}
