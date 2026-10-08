import { BadRequestError, Body, CurrentUser, HttpError, JsonController, Post, Req } from 'routing-controllers';
import type { Request } from 'express';
import { Service } from 'typedi';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, Max, Min, Validate } from 'class-validator';
import { ANALYSIS_ENGINES, type AnalysisEngine, type AnalysisInput, type AnalysisOutput } from '../../../../shared/app/hexplorer.js';
import { MAX_BOARDSIZE, MIN_BOARDSIZE } from '../../../../shared/app/models/GameOptions.js';
import { IsHexCoordinate } from '../../../../shared/app/validator/IsHexCoordinate.js';
import { rateLimiterConsumeAnalyzePosition, rateLimiterConsumeAnalyzePositionMcts } from '../../../services/rate-limiters.js';
import { SimilarPlayingPositionChecker } from '../../../services/anti-cheat/SimilarPlayingPositionChecker.js';
import type { Move } from '@playhex/move-notation';
import { InvalidPositionError, type CanonicalPosition } from '../../../../shared/position-comparator/position-comparator.js';
import { Player } from '../../../../shared/app/models/index.js';
import { SimilarPositionDetectedError, similarPositionDetectedToTranslatableHttpError } from '../../../services/anti-cheat/SimilarPositionDetectedError.js';
import AiJobService from '../../../ai-jobs/AiJobService.js';
import PositionAnalysisCache from '../../../ai-jobs/PositionAnalysisCache.js';

/**
 * A single board can hold at most boardsize² stones.
 */
const MAX_STONES = MAX_BOARDSIZE * MAX_BOARDSIZE;

/**
 * Validated request body. `whitelist`/`forbidNonWhitelisted` are enabled globally,
 * so unknown properties are rejected and each field below is enforced, preventing
 * malformed or oversized positions from reaching the AI backend.
 */
class AnalyzePositionInput implements AnalysisInput
{
    @IsInt()
    @Min(MIN_BOARDSIZE)
    @Max(MAX_BOARDSIZE)
    size: number;

    @IsIn(['black', 'white'])
    color: 'black' | 'white';

    @IsArray()
    @ArrayMaxSize(MAX_STONES)
    @Validate(IsHexCoordinate, { each: true })
    black: string[];

    @IsArray()
    @ArrayMaxSize(MAX_STONES)
    @Validate(IsHexCoordinate, { each: true })
    white: string[];

    /**
     * Only the engine can be chosen, its power (i.e playouts) is set by server.
     */
    @IsOptional()
    @IsIn(ANALYSIS_ENGINES)
    engine?: AnalysisEngine;
}

@JsonController()
@Service()
export default class HexplorerController
{
    constructor(
        private similarPlayingPositionChecker: SimilarPlayingPositionChecker,
        private aiJobService: AiJobService,
        private positionAnalysisCache: PositionAnalysisCache,
    ) {}

    @Post('/api/hexplorer/analyze-position')
    async analyzePosition(
        @Body() body: AnalyzePositionInput,
        @Req() request: Request,
        @CurrentUser() player?: Player,
    ): Promise<AnalysisOutput> {
        const mcts = body.engine === 'katahex-mcts';

        await rateLimiterConsumeAnalyzePosition(request.ip);

        let position: CanonicalPosition;

        try {
            position = this.similarPlayingPositionChecker.checkPosition({
                boardsize: body.size,
                black: body.black as Move[],
                white: body.white as Move[],
            });
        } catch (e) {
            if (e instanceof InvalidPositionError) {
                throw new BadRequestError(e.message);
            }

            if (e instanceof SimilarPositionDetectedError) {
                void this.similarPlayingPositionChecker.flag(e, {
                    context: 'hexplorer',
                    playerPublicId: player?.publicId ?? null,
                    ip: request.ip ?? null,
                });

                throw similarPositionDetectedToTranslatableHttpError(e);
            }

            throw e;
        }

        // Only use the checked position from now on, never the raw input
        const input: AnalysisInput = {
            size: body.size,
            color: body.color,
            black: position.black,
            white: position.white,
            engine: mcts ? 'katahex-mcts' : 'katahex-intuition',
        };

        const cached = await this.positionAnalysisCache.get(input);

        if (cached !== null) {
            return cached;
        }

        if (!this.aiJobService.isAnalysisEngineAvailable(input.engine ?? 'katahex-intuition')) {
            throw new HttpError(503, 'No AI worker can analyze positions right now');
        }

        // Only when a tree search is actually run, cached results are cheap
        if (mcts) {
            await rateLimiterConsumeAnalyzePositionMcts(request.ip);
        }

        return await this.positionAnalysisCache.analyze(input);
    }
}
