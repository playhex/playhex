import { BadRequestError, Get, HttpError, JsonController, NotFoundError, OnUndefined, Param, Put } from 'routing-controllers';
import { Service } from 'typedi';
import { isSpecialHexMove } from '@playhex/move-notation';
import GameAnalyzeRepository from '../../../repositories/GameAnalyzeRepository.js';
import { GameAnalyze, ChatMessage, Player } from '../../../../shared/app/models/index.js';
import type { GameAnalyzeMoveMcts } from '../../../../shared/app/models/GameAnalyze.js';
import { HexServer } from '../../../server.js';
import Rooms from '../../../../shared/app/Rooms.js';
import logger from '../../../services/logger.js';
import GameStore from '../../../store/GameStore.js';
import { errorToLogger } from '../../../../shared/app/utils.js';
import GameRepository from '../../../repositories/GameRepository.js';
import { hasGameAnalyzeErrored } from '../../../../shared/app/models/GameAnalyze.js';
import AiJobService from '../../../ai-jobs/AiJobService.js';
import { getAnalyzeMoveInput } from '../../../ai-jobs/gameAnalyze.js';
import type { AnalyzeMoveOutput, MoveAndValue } from '../../../ai-jobs/protocol.js';
import { MCTS_PLAYOUTS } from '../../../../shared/app/mctsSettings.js';
import { AuthenticatedPlayer } from '../middlewares.js';
import { rateLimiterConsumeAnalyzeMoveMcts } from '../../../services/rate-limiters.js';

type MctsMove = GameAnalyzeMoveMcts['move'];

/**
 * Tree search always sets whiteWin of played move and best moves, see protocol.
 *
 * @throws {Error} If worker did not set it.
 */
const toMctsMove = ({ move, value, whiteWin }: MoveAndValue): MctsMove => {
    if (whiteWin === undefined) {
        throw new Error(`Tree search result without whiteWin for move "${move}"`);
    }

    return { move: move as MctsMove['move'], value, whiteWin };
};

@JsonController()
@Service()
export default class GameAnalyzeController
{
    /**
     * Deep analyzes being processed, by "publicId:moveIndex",
     * to not process same move twice.
     */
    private pendingMctsAnalyzes = new Set<string>();

    /**
     * Last game analyze update by game publicId,
     * to persist deep analyzes results of a same game one after the other.
     */
    private gameAnalyzeUpdates = new Map<string, Promise<void>>();

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

        if (!this.aiJobService.isJobTypeAvailable('katahex-intuition-analyze-game')) {
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
            gameAnalyze.analyze = await this.aiJobService.analyzeGame(analyzeGameRequest);
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

    /**
     * Deep analyze of a single move of an analyzed game, with tree search.
     * Result is sent later with "analyze" socket event, or "analyzeMoveMctsFailed".
     */
    @Put('/api/games/:publicId/analyze/moves/:moveIndex/mcts')
    @OnUndefined(202)
    async requestMoveMctsAnalyze(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Param('moveIndex') moveIndex: number,
    ): Promise<void> {
        if (!Number.isInteger(moveIndex) || moveIndex < 0) {
            throw new BadRequestError('Invalid move index');
        }

        const gameAnalyze = await this.gameAnalyzeRepository.findByGamePublicId(publicId);

        if (gameAnalyze === null || gameAnalyze.endedAt === null || gameAnalyze.analyze === null) {
            throw new BadRequestError('Game must be analyzed first');
        }

        const moveAnalyze = gameAnalyze.analyze[moveIndex];

        if (moveAnalyze === undefined) {
            throw new BadRequestError('Invalid move index');
        }

        // Intuition analyze of this move failed, deep analyze would be lost
        if (moveAnalyze === null) {
            throw new BadRequestError('This move has not been analyzed');
        }

        const pendingKey = `${publicId}:${moveIndex}`;

        if (moveAnalyze.mcts || this.pendingMctsAnalyzes.has(pendingKey)) {
            return;
        }

        const analyzeGameRequest = await this.gameRepository.getAnalyzeGameRequest(publicId);

        if (analyzeGameRequest === null) {
            throw new NotFoundError('Game not found or not finished');
        }

        const input = getAnalyzeMoveInput(analyzeGameRequest, moveIndex);

        if (!input || isSpecialHexMove(input.move)) {
            throw new BadRequestError('This move cannot be analyzed');
        }

        if (!this.aiJobService.isJobTypeAvailable('katahex-mcts-analyze-move')) {
            throw new HttpError(503, 'No AI worker can deeply analyze moves right now');
        }

        await rateLimiterConsumeAnalyzeMoveMcts(player.publicId);

        this.pendingMctsAnalyzes.add(pendingKey);

        this.aiJobService.analyzeMoveMcts(input)
            .then(result => this.saveMoveMctsAnalyze(publicId, moveIndex, result))
            .catch(e => {
                logger.error('Error in game analyze move mcts', { publicId, moveIndex, ...errorToLogger(e) });
                this.io.to(Rooms.game(publicId)).emit('analyzeMoveMctsFailed', publicId, moveIndex);
            })
            .finally(() => this.pendingMctsAnalyzes.delete(pendingKey))
        ;
    }

    /**
     * Add deep analyze result to game analyze, persist and send it.
     * Updates of a same game are done one after the other, from latest persisted game analyze,
     * to not lose another move deep analyze finished at same time.
     *
     * @param moveIndex Requested move, not the one from worker result, to not trust it.
     */
    private async saveMoveMctsAnalyze(publicId: string, moveIndex: number, result: AnalyzeMoveOutput): Promise<void>
    {
        const update = (this.gameAnalyzeUpdates.get(publicId) ?? Promise.resolve())
            .catch(() => {})
            .then(async () => {
                const gameAnalyze = await this.gameAnalyzeRepository.findByGamePublicId(publicId);
                const moveAnalyze = gameAnalyze?.analyze?.[moveIndex];

                if (!gameAnalyze || !moveAnalyze) {
                    throw new Error('Game analyze or analyzed move not found');
                }

                moveAnalyze.mcts = {
                    playouts: MCTS_PLAYOUTS,
                    whiteWin: result.whiteWin,
                    move: toMctsMove(result.move),
                    bestMoves: result.bestMoves.map(toMctsMove),
                };

                await this.gameAnalyzeRepository.persist(publicId, gameAnalyze);

                this.io.to(Rooms.game(publicId)).emit('analyze', publicId, gameAnalyze);
            })
        ;

        this.gameAnalyzeUpdates.set(publicId, update);

        try {
            await update;
        } finally {
            if (this.gameAnalyzeUpdates.get(publicId) === update) {
                this.gameAnalyzeUpdates.delete(publicId);
            }
        }
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
