import { BadRequestError, Body, CurrentUser, HttpError, JsonController, Post, Req } from 'routing-controllers';
import type { Request } from 'express';
import { Service } from 'typedi';
import { createClient } from 'redis';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, Max, Min, Validate } from 'class-validator';
import { ANALYSIS_ENGINES, analysisCacheKey, type AnalysisEngine, type AnalysisInput, type AnalysisOutput } from '../../../../shared/app/hexplorer.js';
import { MAX_BOARDSIZE, MIN_BOARDSIZE } from '../../../../shared/app/models/GameOptions.js';
import { IsHexCoordinate } from '../../../../shared/app/validator/IsHexCoordinate.js';
import { rateLimiterConsumeAnalyzePosition, rateLimiterConsumeAnalyzePositionMcts } from '../../../services/rate-limiters.js';
import { SimilarPlayingPositionChecker } from '../../../services/anti-cheat/SimilarPlayingPositionChecker.js';
import type { Move } from '@playhex/move-notation';
import { InvalidPositionError, type CanonicalPosition } from '../../../../shared/position-comparator/position-comparator.js';
import { Player } from '../../../../shared/app/models/index.js';
import { SimilarPositionDetectedError, similarPositionDetectedToTranslatableHttpError } from '../../../services/anti-cheat/SimilarPositionDetectedError.js';
import AiJobService from '../../../ai-jobs/AiJobService.js';

const ANALYSIS_CACHE_TTL_SECONDS = 7 * 24 * 3600;

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

const { REDIS_URL, REDIS_PREFIX } = process.env;
const redisKeyPrefix = (REDIS_PREFIX ?? 'hex') + '-hexplorer-analysis:';

const redisClient = REDIS_URL
    ? createClient({ url: REDIS_URL })
    : null;

if (redisClient) {
    void redisClient.connect();
}

@JsonController()
@Service()
export default class HexplorerController
{
    constructor(
        private similarPlayingPositionChecker: SimilarPlayingPositionChecker,
        private aiJobService: AiJobService,
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

        const cacheKey = redisKeyPrefix + analysisCacheKey(input);

        if (redisClient) {
            const cached = await redisClient.get(cacheKey);
            if (cached !== null) {
                return JSON.parse(cached) as AnalysisOutput;
            }
        }

        if (!this.aiJobService.isAnalysisEngineAvailable(input.engine ?? 'katahex-intuition')) {
            throw new HttpError(503, 'No AI worker can analyze positions right now');
        }

        // Only when a tree search is actually run, cached results are cheap
        if (mcts) {
            await rateLimiterConsumeAnalyzePositionMcts(request.ip);
        }

        const result: AnalysisOutput = await this.aiJobService.analyzePosition({
            size: input.size,
            color: input.color,
            black: input.black.join(' '),
            white: input.white.join(' '),
        }, mcts);

        if (redisClient) {
            void redisClient.set(cacheKey, JSON.stringify(result), {
                EX: ANALYSIS_CACHE_TTL_SECONDS,
            });
        }

        return result;
    }
}
