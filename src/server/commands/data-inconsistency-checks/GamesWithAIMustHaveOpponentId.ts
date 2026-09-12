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
export class GamesWithAIMustHaveOpponentId implements DataInconsistenciesCheckerInterface
{
    constructor(
        @Inject('Repository<Game>')
        private gameRepository: Repository<Game>,
    ) {}

    getDescription(): string
    {
        return 'Bot games must have an opponentPublicId';
    }

    async run(): Promise<string[]>
    {
        type Result = {
            game_publicId: string;
            game_createdAt: Date;
        };

        const missingAiPublicId: Result[] = await this.gameRepository
            .createQueryBuilder('game')
            .where('game.opponentType = "ai"')
            .andWhere('game.opponentPublicId is null')
            .execute()
        ;

        const gameToString = (game: Result) => [
            game.game_publicId,
            game.game_createdAt,
        ].join(' ');

        return missingAiPublicId.map(game => gameToString(game));
    }
}
