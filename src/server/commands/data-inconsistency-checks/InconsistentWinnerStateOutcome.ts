import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Game } from '../../../shared/app/models/index.js';
import { DataInconsistenciesCheckerInterface } from './DataInconsistenciesCheckerInterface.js';
import { GameState } from '../../../shared/app/Types.js';
import { Outcome, PlayerIndex } from '../../../shared/game-engine/Types.js';

/**
 * Possible values for winner, outcome and state:
 *  - select distinct winner from game;
 *  - select distinct outcome from game;
 *  - select distinct state from game;
 *
 * E.g a canceled game cannot have a winner,
 * or a canceled game cannot have a "time" outcome (or any other outcome)
 */
@Service()
export class InconsistentWinnerStateOutcome implements DataInconsistenciesCheckerInterface
{
    constructor(
        @Inject('Repository<Game>')
        private gameRepository: Repository<Game>,
    ) {}

    getDescription(): string
    {
        return 'state/outcome/winner must be consistent';
    }

    async run(): Promise<string[]>
    {
        type Result = {
            game_publicId: string;
            game_state: GameState;
            game_createdAt: Date;
            game_outcome: Outcome;
            game_winner: null | PlayerIndex;
        };

        const inconsistents: Result[] = await this.gameRepository
            .createQueryBuilder('game')
            .orWhere('(game.state = "created" and (outcome is not null or winner is not null))')
            .orWhere('(game.state = "playing" and (outcome is not null or winner is not null))')
            .orWhere('(game.state = "canceled" and (outcome is not null or winner is not null))')
            .orWhere('(game.state = "ended" and (outcome is null or winner is null))')
            .select('game.publicId')
            .addSelect('game.state')
            .addSelect('game.outcome')
            .addSelect('game.winner')
            .addSelect('game.createdAt')
            .execute()
        ;

        return inconsistents.map(i => `${i.game_publicId} state:${i.game_state} outcome:${i.game_outcome ?? 'null'} winner:${i.game_winner ?? 'null'} (created at ${i.game_createdAt.toISOString()})`);
    }
}
