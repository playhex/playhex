import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Game, HostedGame } from '../../../shared/app/models/index.js';
import { DataInconsistenciesCheckerInterface } from './DataInconsistenciesCheckerInterface.js';

/**
 * In some games, move playedAt were not ordered in two cases:
 *
 * - There was a bug with swap-pieces and pass moves: playedAt date was set to now
 *      when retrieved from database, so next persist has replaced it by now,
 *      which was a future date.
 *
 *      In this case we need to retrieve the correct date from logs, like:
 *
 *      `grep 909df4ba-779f-407a-b562-46730e46a2a5 .pm2/logs/hex-out.log | grep "Move played"`
 *
 *      then fix date in database.
 *
 * - Back in time, move timestamps were taken from client date.
 *      This has been fixed: we now set server date on incoming moves.
 *      This caused first games having moves player date shifted.
 *      In some case it was like 3 seconds,
 *      and make player moves date after opponent move response date
 */
@Service()
export class MoveTimestampsAreOrdered implements DataInconsistenciesCheckerInterface
{
    constructor(
        @Inject('Repository<Game>')
        private gameRepository: Repository<Game>,

        @Inject('Repository<HostedGame>')
        private hostedGameRepository: Repository<HostedGame>,
    ) {}

    getDescription(): string
    {
        return 'Moves playedAt must be ordered';
    }

    async run(): Promise<string[]>
    {
        const games = await this.gameRepository.find();

        const unordereds: {
            hostedGame: HostedGame;
            moves: number[];
        }[] = [];

        for (const game of games) {
            const moves: number[] = [];

            for (let i = 1; i < game.movesHistory.length; ++i) {
                if (game.movesHistory[i].playedAt < game.movesHistory[i - 1].playedAt) {
                    moves.push(i);
                }
            }

            if (moves.length > 0) {
                const hostedGame = await this.hostedGameRepository.findOne({
                    where: {
                        id: game.hostedGameId,
                    },
                    relations: {
                        gameData: true,
                    },
                });

                if (hostedGame === null) {
                    throw new Error('No hostedGame with id = ' + game.hostedGameId);
                }

                unordereds.push({ hostedGame, moves });
            }
        }

        return unordereds.map(unordered => {
            const { hostedGame, moves } = unordered;

            return `publicId ${hostedGame.publicId} hostedGameId ${hostedGame.id} ; moves ${moves.join(', ')} (length = ${hostedGame.gameData!.movesHistory.length}, opponentType = ${hostedGame.opponentType})`;
        });
    }
}
