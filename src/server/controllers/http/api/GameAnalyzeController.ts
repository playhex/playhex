import HttpError from '../HttpError';
import { Get, JsonController, Param, Put } from 'routing-controllers';
import { Service } from 'typedi';
import GameAnalyzePersister from '../../../persistance/GameAnalyzePersister';
import HexAiApiClient from '../../../services/HexAiApiClient';
import GamePersister from '../../../persistance/GamePersister';
import GameAnalyze, { hasGameAnalyzeErrored } from '../../../../shared/app/models/GameAnalyze';
import { HexServer } from '../../../server';
import Rooms from '../../../../shared/app/Rooms';
import { normalize } from '../../../../shared/app/serializer';
import logger from '../../../services/logger';

@JsonController()
@Service()
export default class GameAnalyzeController
{
    constructor(
        private gameAnalyzePersister: GameAnalyzePersister,
        private gamePersister: GamePersister,
        private hexAiApiClient: HexAiApiClient,
        private io: HexServer,
    ) {}

    @Get('/api/games/:publicId/analyze')
    async getOne(
        @Param('publicId') publicId: string,
    ) {
        const gameAnalyze = await this.gameAnalyzePersister.findByGamePublicId(publicId);

        if (null === gameAnalyze) {
            throw new HttpError(404, 'Game analyze not yet processed');
        }

        return normalize(gameAnalyze);
    }

    @Put('/api/games/:publicId/analyze')
    async requestAnalyze(
        @Param('publicId') publicId: string,
    ) {
        let gameAnalyze = await this.gameAnalyzePersister.findByGamePublicId(publicId);

        if (null !== gameAnalyze && !hasGameAnalyzeErrored(gameAnalyze)) {
            return normalize(gameAnalyze);
        }

        const analyzeGameRequest = await this.gamePersister.getAnalyzeGameRequest(publicId);

        if (null === analyzeGameRequest) {
            throw new HttpError(404, 'Game not found or not finished');
        }

        gameAnalyze = new GameAnalyze();
        gameAnalyze.startedAt = new Date();

        await this.gameAnalyzePersister.persist(publicId, gameAnalyze);

        this.io.to(Rooms.game(publicId)).emit('analyze', publicId, gameAnalyze);

        (async () => {
            try {
                gameAnalyze.analyze = await this.hexAiApiClient.analyzeGame(analyzeGameRequest);
            } catch (e) {
                if (!(e instanceof Error)) {
                    throw e;
                }

                logger.error('Error in game analyze', { reason: e.message, stack: e.stack });
                gameAnalyze.analyze = null;
            }

            gameAnalyze.endedAt = new Date();

            await this.gameAnalyzePersister.persist(publicId, gameAnalyze);

            this.io.to(Rooms.game(publicId)).emit('analyze', publicId, gameAnalyze);
        })();

        return normalize(gameAnalyze);
    }
}
