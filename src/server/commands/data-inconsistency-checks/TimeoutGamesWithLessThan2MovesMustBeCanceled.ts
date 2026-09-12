import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Game } from '../../../shared/app/models/index.js';
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
        @Inject('Repository<Game>')
        private gameRepository: Repository<Game>,
    ) {}

    getDescription(): string
    {
        return 'Game that timeouts with 0 or one move must be canceled';
    }

    async run(): Promise<string[]>
    {
        type Result = {
            game_publicId: string;
            game_createdAt: Date;
            game_ranked: 0 | 1;
        };

        const uncanceled: Result[] = await this.gameRepository
            .createQueryBuilder('game')
            .where('game.outcome = "time"')
            .andWhere('game.state = "ended"')
            .andWhere(`CASE
                WHEN game.moves = '' OR game.moves IS NULL THEN 0
                ELSE LENGTH(game.moves) - LENGTH(REPLACE(game.moves, ' ', '')) + 1
            END < 2`)
            .groupBy('game.id')
            .execute()
        ;

        const gameToString = (label: string, game: Result) => [
            label,
            game.game_publicId,
            game.game_createdAt,
            game.game_ranked ? '(ranked)' : '',
        ].join(' ');

        return uncanceled.map(game => gameToString('timeout with <2 moves but not canceled', game));
    }
}
