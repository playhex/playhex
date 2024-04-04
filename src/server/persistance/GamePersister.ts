import prisma from '../services/prisma';
import { AnalyzeGameRequest } from '../services/HexAiApiClient';
import { Move } from '../../shared/game-engine';
import { MoveData } from '../../shared/game-engine/Types';
import { Service } from 'typedi';

@Service()
export default class GamePersister
{
    /**
     * Get only data required for a game analyze.
     * Game must have ended.
     */
    async getAnalyzeGameRequest(publicId: string): Promise<null | AnalyzeGameRequest>
    {
        const data = await prisma.game.findFirst({
            select: {
                size: true,
                movesHistory: true,
                hostedGameId: true,
            },
            where: {
                hostedGame: {
                    publicId: publicId,
                },
                NOT: {
                    endedAt: null,
                },
            },
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
            movesHistory: Move.movesAsString((movesHistory as unknown as MoveData[])
                .map(moveData => Move.fromData(moveData)),
            ),
        };
    }
}
