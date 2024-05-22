import { IsNull, Not, Repository } from 'typeorm';
import { Game } from '@shared/app/models';
import { AnalyzeGameRequest } from '../services/HexAiApiClient';
import { Move } from '../../shared/game-engine';
import { Inject, Service } from 'typedi';

@Service()
export default class GamePersister
{
    constructor(
        @Inject('Repository<Game>')
        private gameRepository: Repository<Game>,
    ) {}

    /**
     * Get only data required for a game analyze.
     * Game must have ended.
     */
    async getAnalyzeGameRequest(publicId: string): Promise<null | AnalyzeGameRequest>
    {
        const data = await this.gameRepository.findOne({
            select: {
                size: true,
                movesHistory: true,
                hostedGameId: true,
            },
            where: {
                hostedGame: {
                    publicId,
                },
                endedAt: Not(IsNull()),
            }
        });

        if (null === data) {
            return null;
        }

        const { movesHistory } = data;

        if (!Array.isArray(movesHistory)) {
            throw new Error('Unexpected data in game.movesHistory');
        }

        return {
            size: data.size,
            movesHistory: Move.movesAsString(movesHistory
                .map(moveData => Move.fromData(moveData)),
            ),
        };
    }
}
