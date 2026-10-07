import { BadRequestError, Get, HttpError, JsonController, NotFoundError, OnUndefined, Param, Put, QueryParams, Res } from 'routing-controllers';
import { Service } from 'typedi';
import type { Response } from 'express';
import { format } from 'content-range';
import { isSpecialHexMove } from '@playhex/move-notation';
import { ExternalGame, ExternalGameAnalyze, GameAnalyze, Player } from '../../shared/app/models/index.js';
import { hasGameAnalyzeErrored, type GameAnalyzeMoveMcts } from '../../shared/app/models/GameAnalyze.js';
import SearchExternalGamesParameters from '../../shared/app/SearchExternalGamesParameters.js';
import { instanceToPlain } from '../../shared/app/class-transformer-custom.js';
import Rooms from '../../shared/app/Rooms.js';
import { errorToLogger } from '../../shared/app/utils.js';
import { MCTS_PLAYOUTS } from '../../shared/app/mctsSettings.js';
import { HexServer } from '../server.js';
import logger from '../services/logger.js';
import AiJobService from '../ai-jobs/AiJobService.js';
import { getAnalyzeMoveInput, type AnalyzeGameRequest } from '../ai-jobs/gameAnalyze.js';
import type { AnalyzeMoveOutput, MoveAndValue } from '../ai-jobs/protocol.js';
import { AuthenticatedPlayer } from '../controllers/http/middlewares.js';
import { rateLimiterConsumeAnalyzeMoveMcts } from '../services/rate-limiters.js';
import ExternalGameRepository from './ExternalGameRepository.js';

type MctsMove = GameAnalyzeMoveMcts['move'];

const toMctsMove = ({ move, value, whiteWin }: MoveAndValue): MctsMove => {
    if (whiteWin === undefined) {
        throw new Error(`Tree search result without whiteWin for move "${move}"`);
    }

    return { move: move as MctsMove['move'], value, whiteWin };
};

/**
 * Same shape as game analyze, so client can display it the same way.
 */
const toGameAnalyze = (externalGameAnalyze: ExternalGameAnalyze): GameAnalyze => {
    const gameAnalyze = new GameAnalyze();

    gameAnalyze.analyze = externalGameAnalyze.analyze;
    gameAnalyze.startedAt = externalGameAnalyze.startedAt;
    gameAnalyze.endedAt = externalGameAnalyze.endedAt;

    return gameAnalyze;
};

const toAnalyzeGameRequest = (externalGame: ExternalGame): AnalyzeGameRequest => ({
    size: externalGame.boardsize,
    movesHistory: externalGame.moves.join(' '),
});

/**
 * Games played outside PlayHex (Little Golem...).
 * Read only, and can be analyzed like PlayHex games.
 */
@JsonController()
@Service()
export default class ExternalGameController
{
    /**
     * Deep analyzes being processed, by "publicId:moveIndex",
     * to not process same move twice.
     */
    private pendingMctsAnalyzes = new Set<string>();

    /**
     * Last analyze update by external game publicId,
     * to persist deep analyzes results of a same game one after the other.
     */
    private analyzeUpdates = new Map<string, Promise<void>>();

    constructor(
        private externalGameRepository: ExternalGameRepository,
        private aiJobService: AiJobService,
        private io: HexServer,
    ) {}

    /**
     * Latest imported first.
     */
    @Get('/api/external-games')
    async getAll(
        @QueryParams() params: SearchExternalGamesParameters,
        @Res() res: Response,
    ) {
        const { results, count } = await this.externalGameRepository.search(params);

        const contentRange = format({
            unit: 'games',
            size: count,
            start: 0,
            end: results.length,
        });

        if (contentRange !== null) {
            res.set('Content-Range', contentRange);
        }

        return instanceToPlain(results, { groups: ['external_game_list'] });
    }

    @Get('/api/external-games/:publicId')
    async getOne(
        @Param('publicId') publicId: string,
    ) {
        return await this.mustFindExternalGame(publicId);
    }

    @Get('/api/external-games/:publicId/analyze')
    @OnUndefined(204)
    async getAnalyze(
        @Param('publicId') publicId: string,
    ) {
        const externalGame = await this.mustFindExternalGame(publicId);
        const externalGameAnalyze = await this.externalGameRepository.findAnalyze(externalGame);

        if (externalGameAnalyze === null) {
            return;
        }

        return toGameAnalyze(externalGameAnalyze);
    }

    @Put('/api/external-games/:publicId/analyze')
    async requestAnalyze(
        @Param('publicId') publicId: string,
    ) {
        const externalGame = await this.mustFindExternalGame(publicId);
        let externalGameAnalyze = await this.externalGameRepository.findAnalyze(externalGame);

        if (externalGameAnalyze !== null && !hasGameAnalyzeErrored(externalGameAnalyze)) {
            return toGameAnalyze(externalGameAnalyze);
        }

        if (externalGame.moves.length === 0) {
            throw new BadRequestError('Game has no moves');
        }

        if (!this.aiJobService.isJobTypeAvailable('katahex-intuition-analyze-game')) {
            throw new HttpError(503, 'No AI worker can analyze games right now');
        }

        const analyzeGameRequest = toAnalyzeGameRequest(externalGame);

        externalGameAnalyze = externalGameAnalyze ?? new ExternalGameAnalyze();
        externalGameAnalyze.analyze = null;
        externalGameAnalyze.startedAt = new Date();
        externalGameAnalyze.endedAt = null;

        await this.externalGameRepository.saveAnalyze(externalGame, externalGameAnalyze);

        this.emitAnalyze(publicId, externalGameAnalyze);

        const pendingAnalyze = externalGameAnalyze;

        (async () => {
            pendingAnalyze.analyze = await this.aiJobService.analyzeGame(analyzeGameRequest);
            pendingAnalyze.endedAt = new Date();

            await this.externalGameRepository.saveAnalyze(externalGame, pendingAnalyze);

            this.emitAnalyze(publicId, pendingAnalyze);
        })().catch(async e => {
            logger.error('Error in external game analyze', errorToLogger(e));

            // Set as errored, else it would stay processing and could not be requested again
            pendingAnalyze.analyze = null;
            pendingAnalyze.endedAt = new Date();

            await this.externalGameRepository.saveAnalyze(externalGame, pendingAnalyze);

            this.emitAnalyze(publicId, pendingAnalyze);
        }).catch(e => {
            logger.error('Could not persist errored external game analyze', errorToLogger(e));
        });

        return toGameAnalyze(externalGameAnalyze);
    }

    /**
     * Deep analyze of a single move of an analyzed game, with tree search.
     * Result is sent later with "analyze" socket event, or "analyzeMoveMctsFailed".
     */
    @Put('/api/external-games/:publicId/analyze/moves/:moveIndex/mcts')
    @OnUndefined(202)
    async requestMoveMctsAnalyze(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Param('moveIndex') moveIndex: number,
    ): Promise<void> {
        if (!Number.isInteger(moveIndex) || moveIndex < 0) {
            throw new BadRequestError('Invalid move index');
        }

        const externalGame = await this.mustFindExternalGame(publicId);
        const externalGameAnalyze = await this.externalGameRepository.findAnalyze(externalGame);

        if (externalGameAnalyze === null || externalGameAnalyze.endedAt === null || externalGameAnalyze.analyze === null) {
            throw new BadRequestError('Game must be analyzed first');
        }

        const moveAnalyze = externalGameAnalyze.analyze[moveIndex];

        if (moveAnalyze === undefined) {
            throw new BadRequestError('Invalid move index');
        }

        if (moveAnalyze === null) {
            throw new BadRequestError('This move has not been analyzed');
        }

        const pendingKey = `${publicId}:${moveIndex}`;

        if (moveAnalyze.mcts || this.pendingMctsAnalyzes.has(pendingKey)) {
            return;
        }

        const input = getAnalyzeMoveInput(toAnalyzeGameRequest(externalGame), moveIndex);

        if (!input || isSpecialHexMove(input.move)) {
            throw new BadRequestError('This move cannot be analyzed');
        }

        if (!this.aiJobService.isJobTypeAvailable('katahex-mcts-analyze-move')) {
            throw new HttpError(503, 'No AI worker can deeply analyze moves right now');
        }

        await rateLimiterConsumeAnalyzeMoveMcts(player.publicId);

        this.pendingMctsAnalyzes.add(pendingKey);

        this.aiJobService.analyzeMoveMcts(input)
            .then(result => this.saveMoveMctsAnalyze(externalGame, moveIndex, result))
            .catch(e => {
                logger.error('Error in external game analyze move mcts', { publicId, moveIndex, ...errorToLogger(e) });
                this.io.to(Rooms.externalGame(publicId)).emit('analyzeMoveMctsFailed', publicId, moveIndex);
            })
            .finally(() => this.pendingMctsAnalyzes.delete(pendingKey))
        ;
    }

    private async saveMoveMctsAnalyze(externalGame: ExternalGame, moveIndex: number, result: AnalyzeMoveOutput): Promise<void>
    {
        const { publicId } = externalGame;

        const update = (this.analyzeUpdates.get(publicId) ?? Promise.resolve())
            .catch(() => {})
            .then(async () => {
                const externalGameAnalyze = await this.externalGameRepository.findAnalyze(externalGame);
                const moveAnalyze = externalGameAnalyze?.analyze?.[moveIndex];

                if (!externalGameAnalyze || !moveAnalyze) {
                    throw new Error('External game analyze or analyzed move not found');
                }

                moveAnalyze.mcts = {
                    playouts: MCTS_PLAYOUTS,
                    whiteWin: result.whiteWin,
                    move: toMctsMove(result.move),
                    bestMoves: result.bestMoves.map(toMctsMove),
                };

                await this.externalGameRepository.saveAnalyze(externalGame, externalGameAnalyze);

                this.emitAnalyze(publicId, externalGameAnalyze);
            })
        ;

        this.analyzeUpdates.set(publicId, update);

        try {
            await update;
        } finally {
            if (this.analyzeUpdates.get(publicId) === update) {
                this.analyzeUpdates.delete(publicId);
            }
        }
    }

    private emitAnalyze(publicId: string, externalGameAnalyze: ExternalGameAnalyze): void
    {
        this.io.to(Rooms.externalGame(publicId)).emit('analyze', publicId, toGameAnalyze(externalGameAnalyze));
    }

    private async mustFindExternalGame(publicId: string): Promise<ExternalGame>
    {
        const externalGame = await this.externalGameRepository.findByPublicId(publicId);

        if (externalGame === null) {
            throw new NotFoundError('External game not found');
        }

        return externalGame;
    }
}
