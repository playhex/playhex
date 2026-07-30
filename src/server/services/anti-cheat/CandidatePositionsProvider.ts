import { Service } from 'typedi';
import { Position } from '../../../shared/position-comparator/position-comparator.js';
import { CandidatePositionsProviderInterface } from './CandidatePositionsProviderInterface.js';
import HostedGameStore from '../../store/HostedGameStore.js';

const { BASE_URL } = process.env;

@Service()
export class CandidatePositionsProvider implements CandidatePositionsProviderInterface
{
    constructor(
        private hostedGameStore: HostedGameStore,
    ) {}

    getCandidatePositions(): Position[]
    {
        const positions: Position[] = [];
        const activeGames = this.hostedGameStore.getActiveGames();

        for (const publicId in activeGames) {
            const hostedGameServer = activeGames[publicId];
            const hostedGame = hostedGameServer.getHostedGame();

            if (hostedGame.state !== 'playing'
                || hostedGame.opponentType !== 'player'
                || hostedGame.moves.length < 4
            ) {
                continue;
            }

            positions.push({
                boardsize: hostedGame.boardsize,
                moves: hostedGame.moves,
                source: BASE_URL
                    ? BASE_URL + '/games/' + publicId
                    : publicId
                ,
            });
        }

        return positions;
    }
}
