import HttpError from '../HttpError.js';
import { Get, JsonController, OnUndefined, Param, Put } from 'routing-controllers';
import { Service } from 'typedi';
import GameAnalyzePersister from '../../../persistance/GameAnalyzePersister.js';
import HexAiApiClient from '../../../services/HexAiApiClient.js';
import GamePersister from '../../../persistance/GamePersister.js';
import GameAnalyze, { hasGameAnalyzeErrored } from '../../../../shared/app/models/GameAnalyze.js';
import { HexServer } from '../../../server.js';
import Rooms from '../../../../shared/app/Rooms.js';
import logger from '../../../services/logger.js';

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
    @OnUndefined(404)
    async getOne(
        @Param('publicId') publicId: string,
    ) {
        const gameAnalyze = await this.gameAnalyzePersister.findByGamePublicId(publicId);

        if (null === gameAnalyze) {
            return;
        }

        return gameAnalyze;
    }

    @Put('/api/games/:publicId/analyze')
    async requestAnalyze(
        @Param('publicId') publicId: string,
    ) {
        let gameAnalyze = await this.gameAnalyzePersister.findByGamePublicId(publicId);

        if (null !== gameAnalyze && !hasGameAnalyzeErrored(gameAnalyze)) {
            return gameAnalyze;
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

        return gameAnalyze;
    }
}
