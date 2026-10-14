import { BadRequestError, Get, HttpCode, HttpError, JsonController, NotFoundError, OnUndefined, Param, Put, QueryParam } from 'routing-controllers';
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
import type { AnalyzeMoveInput, AnalyzeMoveOutput, MoveAndValue } from '../../../ai-jobs/protocol.js';
import PendingMctsMoveAnalyzes from '../../../ai-jobs/PendingMctsMoveAnalyzes.js';
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
        private pendingMctsMoveAnalyzes: PendingMctsMoveAnalyzes,
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
     * Deep analyze of a range of moves of an analyzed game, with tree search.
     * Range is clamped to game moves.
     * Moves already deeply analyzed, being processed, or that cannot be analyzed are ignored.
     * Results are sent later with "analyze" socket event, or "analyzeMoveMctsFailed", for each move.
     *
     * @returns Moves being processed in this range, including ones requested before.
     */
    @Put('/api/games/:publicId/analyze/moves/mcts')
    @HttpCode(202)
    async requestMovesMctsAnalyze(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @QueryParam('from', { required: true }) from: number,
        @QueryParam('to', { required: true }) to: number,
    ): Promise<{ moveIndexes: number[] }> {
        if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
            throw new BadRequestError('Invalid moves range');
        }

        const gameAnalyze = await this.gameAnalyzeRepository.findByGamePublicId(publicId);

        if (gameAnalyze === null || gameAnalyze.endedAt === null || gameAnalyze.analyze === null) {
            throw new BadRequestError('Game must be analyzed first');
        }

        const analyzeGameRequest = await this.gameRepository.getAnalyzeGameRequest(publicId);

        if (analyzeGameRequest === null) {
            throw new NotFoundError('Game not found or not finished');
        }

        if (!this.aiJobService.isJobTypeAvailable('katahex-mcts-analyze-move')) {
            throw new HttpError(503, 'No AI worker can deeply analyze moves right now');
        }

        // No await from here to reservation, so overlapping requests cannot reserve same move
        const inputs = new Map<number, AnalyzeMoveInput>();

        for (let moveIndex = Math.max(from, 0); moveIndex <= Math.min(to, gameAnalyze.analyze.length - 1); ++moveIndex) {
            const moveAnalyze = gameAnalyze.analyze[moveIndex];

            // Intuition analyze of this move failed, deep analyze would be lost
            if (!moveAnalyze || moveAnalyze.mcts) {
                continue;
            }

            const input = getAnalyzeMoveInput(analyzeGameRequest, moveIndex);

            if (!input || isSpecialHexMove(input.move)) {
                continue;
            }

            inputs.set(moveIndex, input);
        }

        const moveIndexes = [...inputs.keys()];
        const reserved = this.pendingMctsMoveAnalyzes.reserve('game', publicId, moveIndexes);

        if (reserved.length > 0) {
            try {
                await rateLimiterConsumeAnalyzeMoveMcts(player.publicId, reserved.length);
            } catch (e) {
                this.pendingMctsMoveAnalyzes.release('game', publicId, reserved);
                throw e;
            }
        }

        for (const moveIndex of reserved) {
            this.aiJobService.analyzeMoveMcts(inputs.get(moveIndex) as AnalyzeMoveInput)
                .then(result => this.saveMoveMctsAnalyze(publicId, moveIndex, result))
                .catch(e => {
                    logger.error('Error in game analyze move mcts', { publicId, moveIndex, ...errorToLogger(e) });
                    this.io.to(Rooms.game(publicId)).emit('analyzeMoveMctsFailed', publicId, moveIndex);
                })
                .finally(() => this.pendingMctsMoveAnalyzes.release('game', publicId, moveIndex))
            ;
        }

        return { moveIndexes };
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
