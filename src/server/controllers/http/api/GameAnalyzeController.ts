import { Get, HttpError, JsonController, OnUndefined, Param, Put } from 'routing-controllers';
import { Service } from 'typedi';
import GameAnalyzeRepository from '../../../repositories/GameAnalyzeRepository.js';
import HexAiApiClient from '../../../services/HexAiApiClient.js';
import { GameAnalyze, ChatMessage } from '../../../../shared/app/models/index.js';
import { HexServer } from '../../../server.js';
import Rooms from '../../../../shared/app/Rooms.js';
import logger from '../../../services/logger.js';
import HostedGameStore from '../../../store/HostedGameStore.js';
import { errorToLogger } from '../../../../shared/app/utils.js';
import HostedGameRepository from '../../../repositories/HostedGameRepository.js';
import { hasGameAnalyzeErrored } from '../../../../shared/app/models/GameAnalyze.js';

@JsonController()
@Service()
export default class GameAnalyzeController
{
    constructor(
        private gameAnalyzeRepository: GameAnalyzeRepository,
        private hostedGameRepository: HostedGameRepository,
        private hexAiApiClient: HexAiApiClient,
        private hostedGameStore: HostedGameStore,
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

        const analyzeGameRequest = await this.hostedGameRepository.getAnalyzeGameRequest(publicId);

        if (analyzeGameRequest === null) {
            throw new HttpError(404, 'Game not found or not finished');
        }

        gameAnalyze = new GameAnalyze();
        gameAnalyze.startedAt = new Date();

        await this.gameAnalyzeRepository.persist(publicId, gameAnalyze);

        this.io.to(Rooms.game(publicId)).emit('analyze', publicId, gameAnalyze);

        (async () => {
            gameAnalyze.analyze = await this.hexAiApiClient.analyzeGame(analyzeGameRequest);
            gameAnalyze.endedAt = new Date();

            await this.gameAnalyzeRepository.persist(publicId, gameAnalyze);

            this.io.to(Rooms.game(publicId)).emit('analyze', publicId, gameAnalyze);

            await this.hostedGameStore.postChatMessage(publicId, this.createGameAnalyzeAvailableChatMessage(gameAnalyze));
        })().catch(e => {
            logger.error('Error in game analyze', errorToLogger(e));
            gameAnalyze.analyze = null;
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
