import { Body, JsonController, Post } from 'routing-controllers';
import { Service } from 'typedi';
import { createClient } from 'redis';
import { analysisCacheKey, type AnalysisInput, type AnalysisOutput } from '../../../../shared/app/hexplorer.js';

const ANALYSIS_CACHE_TTL_SECONDS = 7 * 24 * 3600;

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
        @Body() body: AnalysisInput,
    ): Promise<AnalysisOutput> {
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
