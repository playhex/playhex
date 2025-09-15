import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { HostedGame } from '../../../shared/app/models/index.js';
import { DataInconsistenciesCheckerInterface } from './DataInconsistenciesCheckerInterface.js';
import { HostedGameState } from '../../../shared/app/Types.js';
import { Outcome, PlayerIndex } from '../../../shared/game-engine/Types.js';

/**
 * Possible values for winner, outcome and state:
 *  - select distinct winner from game;
 *  - select distinct outcome from game;
 *  - select distinct state from hosted_game;
 *
 * E.g a canceled game cannot have a winner,
 * or a canceled game cannot have a "time" outcome (or any other outcome)
 */
@Service()
export class InconsistentWinnerStateOutcome implements DataInconsistenciesCheckerInterface
{
    constructor(
        @Inject('Repository<HostedGame>')
        private hostedGameRepository: Repository<HostedGame>,
    ) {}

    getDescription(): string
    {
        return 'state/outcome/winner must be consistent';
    }

    async run(): Promise<string[]>
    {
        type Result = {
            hostedGame_publicId: string;
            hostedGame_state: HostedGameState;
            hostedGame_createdAt: Date;
            game_outcome: Outcome;
            game_winner: null | PlayerIndex;
        };

        const inconsistents: Result[] = await this.hostedGameRepository
            .createQueryBuilder('hostedGame')
            .innerJoin('hostedGame.gameData', 'game')
            .orWhere('(hostedGame.state = "created" and (outcome is not null or winner is not null))')
            .orWhere('(hostedGame.state = "playing" and (outcome is not null or winner is not null))')
            .orWhere('(hostedGame.state = "canceled" and (outcome is not null or winner is not null))')
            .orWhere('(hostedGame.state = "ended" and winner is null)')
            .select('hostedGame.publicId')
            .addSelect('hostedGame.state')
            .addSelect('game.outcome')
            .addSelect('game.winner')
            .addSelect('hostedGame.createdAt')
            .execute()
        ;

        return inconsistents.map(i => `${i.hostedGame_publicId} state:${i.hostedGame_state} outcome:${i.game_outcome ?? 'null'} winner:${i.game_winner ?? 'null'} (created at ${i.hostedGame_createdAt.toISOString()})`);
    }
}
