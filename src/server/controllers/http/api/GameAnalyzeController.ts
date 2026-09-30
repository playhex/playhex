import { Get, HttpError, JsonController, OnUndefined, Param, Put } from 'routing-controllers';
import { Service } from 'typedi';
import GameAnalyzeRepository from '../../../repositories/GameAnalyzeRepository.js';
import { GameAnalyze, ChatMessage } from '../../../../shared/app/models/index.js';
import { HexServer } from '../../../server.js';
import Rooms from '../../../../shared/app/Rooms.js';
import logger from '../../../services/logger.js';
import GameStore from '../../../store/GameStore.js';
import { errorToLogger } from '../../../../shared/app/utils.js';
import GameRepository from '../../../repositories/GameRepository.js';
import { hasGameAnalyzeErrored } from '../../../../shared/app/models/GameAnalyze.js';
import AiJobService from '../../../ai-jobs/AiJobService.js';

@JsonController()
@Service()
export default class GameAnalyzeController
{
    constructor(
        private gameAnalyzeRepository: GameAnalyzeRepository,
        private gameRepository: GameRepository,
        private aiJobService: AiJobService,
        private gameStore: GameStore,
        private io: HexServer,
    ) {}

    @Get('/api/games/:publicId/analyze')
    @OnUndefined(204)
    async getOne(
        @Param('publicId') publicId: string,
    ) {
        const gameAnalyze = await this.gameAnalyzeRepository.findByGamePublicId(publicId);

        if (gameAnalyze === null) {
            return;
        }

        return gameAnalyze;
    }

    @Put('/api/games/:publicId/analyze')
    async requestAnalyze(
        @Param('publicId') publicId: string,
    ) {
        let gameAnalyze = await this.gameAnalyzeRepository.findByGamePublicId(publicId);

        if (gameAnalyze !== null && !hasGameAnalyzeErrored(gameAnalyze)) {
            return gameAnalyze;
        }

        if (!this.aiJobService.isJobTypeAvailable('katahex-intuition-analyze-move')) {
            throw new HttpError(503, 'No AI worker can analyze games right now');
        }

        const analyzeGameRequest = await this.gameRepository.getAnalyzeGameRequest(publicId);

        if (analyzeGameRequest === null) {
            throw new HttpError(404, 'Game not found or not finished');
        }

        gameAnalyze = new GameAnalyze();
        gameAnalyze.startedAt = new Date();

        await this.gameAnalyzeRepository.persist(publicId, gameAnalyze);

        this.io.to(Rooms.game(publicId)).emit('analyze', publicId, gameAnalyze);

        (async () => {
            gameAnalyze.analyze = await this.aiJobService.analyzeGame(analyzeGameRequest, partialAnalyze => {
                // Partial analyze only sent to players, persisted once finished
                gameAnalyze.analyze = partialAnalyze;
                this.io.to(Rooms.game(publicId)).emit('analyze', publicId, gameAnalyze);
            });
            gameAnalyze.endedAt = new Date();

            await this.gameAnalyzeRepository.persist(publicId, gameAnalyze);

            this.io.to(Rooms.game(publicId)).emit('analyze', publicId, gameAnalyze);

            if (!hasGameAnalyzeErrored(gameAnalyze)) {
                await this.gameStore.postChatMessage(publicId, this.createGameAnalyzeAvailableChatMessage(gameAnalyze));
            }
        })().catch(async e => {
            logger.error('Error in game analyze', errorToLogger(e));

            // Set as errored, else it would stay processing and could not be requested again
            gameAnalyze.analyze = null;
            gameAnalyze.endedAt = new Date();

            await this.gameAnalyzeRepository.persist(publicId, gameAnalyze);

            this.io.to(Rooms.game(publicId)).emit('analyze', publicId, gameAnalyze);
        }).catch(e => {
            logger.error('Could not persist errored game analyze', errorToLogger(e));
        });

        return gameAnalyze;
    }

    private createGameAnalyzeAvailableChatMessage(gameAnalyze: GameAnalyze): ChatMessage
    {
        const chatMessage = new ChatMessage();

        chatMessage.content = 'Game analysis is now available.';
        chatMessage.contentTranslationKey = 'game_analysis.available';
        chatMessage.createdAt = gameAnalyze.endedAt ?? new Date();
        chatMessage.player = null;

        return chatMessage;
    }
}
