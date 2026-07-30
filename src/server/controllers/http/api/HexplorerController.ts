import { Body, JsonController, Post, Req } from 'routing-controllers';
import type { Request } from 'express';
import { Service } from 'typedi';
import { createClient } from 'redis';
import { ArrayMaxSize, IsArray, IsIn, IsInt, Max, Min, Validate } from 'class-validator';
import { analysisCacheKey, type AnalysisInput, type AnalysisOutput } from '../../../../shared/app/hexplorer.js';
import { MAX_BOARDSIZE, MIN_BOARDSIZE } from '../../../../shared/app/models/HostedGameOptions.js';
import { IsHexCoordinate } from '../../../../shared/app/validator/IsHexCoordinate.js';
import { rateLimiterConsumeAnalyzePosition } from '../../../services/rate-limiters.js';

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
}

const { REDIS_URL, REDIS_PREFIX, HEX_AI_API } = process.env;
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
    @Post('/api/hexplorer/analyze-position')
    async analyzePosition(
        @Body() body: AnalyzePositionInput,
        @Req() request: Request,
    ): Promise<AnalysisOutput> {
        await rateLimiterConsumeAnalyzePosition(request.ip);

        const cacheKey = redisKeyPrefix + analysisCacheKey(body);

        if (redisClient) {
            const cached = await redisClient.get(cacheKey);
            if (cached !== null) {
                return JSON.parse(cached) as AnalysisOutput;
            }
        }

        if (!HEX_AI_API) {
            throw new Error('Cannot use HexAiApiClient, HEX_AI_API must be set in env vars');
        }

        const response = await fetch(HEX_AI_API + '/analyze-position', {
            method: 'post',
            body: JSON.stringify({
                ...body,
                black: body.black.join(' '),
                white: body.white.join(' '),
            }),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const result = await response.json() as AnalysisOutput;

        if (redisClient) {
            void redisClient.set(cacheKey, JSON.stringify(result), {
                EX: ANALYSIS_CACHE_TTL_SECONDS,
            });
        }

        return result;
    }
}
