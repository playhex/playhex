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
export class TimeoutGamesWithLessThan2MovesMustBeCanceled implements DataInconsistenciesCheckerInterface
{
    constructor(
        @Inject('Repository<HostedGame>')
        private hostedGameRepository: Repository<HostedGame>,
    ) {}

    getDescription(): string
    {
        return 'Game that timeouts with 0 or one move must be canceled';
    }

    async run(): Promise<string[]>
    {
        type Result = {
            hostedGame_publicId: string;
            hostedGame_createdAt: Date;
            hostedGame_ranked: 0 | 1;
        };

        const uncanceled: Result[] = await this.hostedGameRepository
            .createQueryBuilder('hostedGame')
            .innerJoin('hostedGame.gameData', 'game')
            .where('game.outcome = "time"')
            .andWhere('hostedGame.state = "ended"')
            .andWhere('json_length(game.movesHistory) < 2')
            .groupBy('hostedGame.id')
            .execute()
        ;

        const hostedGameToString = (label: string, hostedGame: Result) => [
            label,
            hostedGame.hostedGame_publicId,
            hostedGame.hostedGame_createdAt,
            hostedGame.hostedGame_ranked ? '(ranked)' : '',
        ].join(' ');

        return uncanceled.map(hostedGame => hostedGameToString('timeout with <2 moves but not canceled', hostedGame));
    }
}
