import { EntityRepository } from '@mikro-orm/core';
import { Game } from '@shared/app/models';
import { AnalyzeGameRequest } from '../services/HexAiApiClient';
import { Move } from '../../shared/game-engine';
import { Inject, Service } from 'typedi';

@Service()
export default class GamePersister
{
    constructor(
        @Inject('EntityRepository<Game>')
        private gameRepository: EntityRepository<Game>,
    ) {}

    /**
     * Get only data required for a game analyze.
     * Game must have ended.
     */
    async getAnalyzeGameRequest(publicId: string): Promise<null | AnalyzeGameRequest>
    {
        const data = await this.gameRepository.findOne({
            hostedGame: {
                publicId,
            },
            // endedAt: Not(IsNull()), // TODO
        }, {
            fields: [
                'size',
                'movesHistory',
                //'hostedGameId', // TODO
            ],
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
