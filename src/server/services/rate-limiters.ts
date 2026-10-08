import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { type RateLimitReachedErrorPayload } from '../../shared/app/rate-limiters.js';

/**
 * Limit chat message posted by player.
 * From http api or websocket message.
 */
const chatMessageLimiter = new RateLimiterMemory({
    keyPrefix: 'rate_limiter.chat_message',
    points: 5,
    duration: 12,
});

/**
 * Channel slow mode limiters, one per "messages per minute" value.
 * Keyed by channel and player.
 */
const channelSlowModeLimiters = new Map<number, RateLimiterMemory>();

const getChannelSlowModeLimiter = (messagesPerMinute: number): RateLimiterMemory => {
    let limiter = channelSlowModeLimiters.get(messagesPerMinute);

    if (!limiter) {
        limiter = new RateLimiterMemory({
            keyPrefix: 'rate_limiter.channel_slow_mode',
            points: messagesPerMinute,
            duration: 60,
        });

        channelSlowModeLimiters.set(messagesPerMinute, limiter);
    }

    return limiter;
};

/**
 * Limit a same ip creating many account.
 * Should not prevent a classroom (same ip) all creating accounts.
 */
const accountCreationLimiter = new RateLimiterMemory({
    keyPrefix: 'rate_limiter.account_creation',
    points: 30,
    duration: 900,
});

/**
 * Limit brute-force by ip.
 */
const failedLoginLimiter = new RateLimiterMemory({
    keyPrefix: 'rate_limiter.failed_login',
    points: 10,
    duration: 300,
});

/**
 * Limit games creation to prevent lobby spam.
 */
const createGameLimiter = new RateLimiterMemory({
    keyPrefix: 'rate_limiter.create_game',
    points: 10,
    duration: 120,
});

/**
 * Limit total challenges (nominative games) a player can send.
 */
const challengePlayerLimiter = new RateLimiterMemory({
    keyPrefix: 'rate_limiter.challenge_player',
    points: 8,
    duration: 300,
});

/**
 * Prevent a player from repeatedly challenging the same target (harassment).
 */
const challengeSameTargetLimiter = new RateLimiterMemory({
    keyPrefix: 'rate_limiter.challenge_same_target',
    points: 2,
    duration: 180,
});

/**
 * Limit brute-force of admin/moderator api key by ip.
 */
const failedApiKeyLimiter = new RateLimiterMemory({
    keyPrefix: 'rate_limiter.failed_api_key',
    points: 10,
    duration: 300,
});

/**
 * Limit hexplorer position analysis, which triggers an expensive AI backend call
 * on cache miss. Prevents a single player from overloading the analyzer.
 */
const analyzePositionLimiter = new RateLimiterMemory({
    keyPrefix: 'rate_limiter.analyze_position',
    points: 180,
    duration: 60,
});

/**
 * Same as analyzePositionLimiter, for hexplorer analysis with tree search, way more expensive.
 * Consumed in addition to analyzePositionLimiter, only when not cached.
 */
const analyzePositionMctsLimiter = new RateLimiterMemory({
    keyPrefix: 'rate_limiter.analyze_position_mcts',
    points: 30,
    duration: 60,
});

/**
 * Limit game analyze moves deep analyzes (tree search), by player.
 */
/**
 * Limit puzzle katahex checks started by a player.
 * Only new checks count, polling a running check or a cached one does not.
 */
const puzzleKatahexCheckLimiter = new RateLimiterMemory({
    keyPrefix: 'rate_limiter.puzzle_katahex_check',
    points: 20,
    duration: 600,
});

const analyzeMoveMctsLimiter = new RateLimiterMemory({
    keyPrefix: 'rate_limiter.analyze_move_mcts',
    points: 30,
    duration: 300,
});

/**
 * Limit jobs an AI worker key can take, to prevent a key taking jobs in loop without processing them.
 * Generous: fast jobs (raw neural network move) can take less than a second.
 */
const aiWorkerNextJobLimiter = new RateLimiterMemory({
    keyPrefix: 'rate_limiter.ai_worker_next_job',
    points: 600,
    duration: 60,
});

/**
 * Linking a Little Golem account searches the player on Little Golem.
 */
const linkExternalAccountLimiter = new RateLimiterMemory({
    keyPrefix: 'rate_limiter.link_external_account',
    points: 10,
    duration: 600,
});

/**
 * Import of all games of a player crawls an external site for a long time.
 */
const importExternalGamesLimiter = new RateLimiterMemory({
    keyPrefix: 'rate_limiter.import_external_games',
    points: 3,
    duration: 3600,
});

/**
 * Error thrown from rate limiter
 */
export class RateLimiterError extends Error {}

/**
 * Error thrown from rate limiter when action has been rate limited
 */
export class RateLimitReachedError extends RateLimiterError
{
    constructor(
        readonly rateLimiterName: string,
        readonly nextActionAvailableInMs: number,
    ) {
        super('This action has been blocked by rate limiter');
    }
}

/**
 * Error thrown from rate limiter for an unexpected error (storage not available, misconfiguration...)
 */
export class RateLimiterServerError extends RateLimiterError {}

/**
 * Transforms a catched rate limiter error to a payload to send to client
 */
export const errorToRateLimitReachedErrorPayload = (error: RateLimitReachedError): RateLimitReachedErrorPayload => {
    return {
        type: 'rate_limit_reached',
        rateLimiterName: error.rateLimiterName,
        nextActionAvailableInMs: error.nextActionAvailableInMs,
    };
};

/**
 * Decorator for consume, transforms error to a RateLimiterError
 */
const consume = async (limiter: RateLimiterMemory, key: string, pointsToConsume = 1) => {
    try {
        await limiter.consume(key, pointsToConsume);
    } catch (e) {
        if (e instanceof RateLimiterRes) {
            throw new RateLimitReachedError(limiter.keyPrefix, e.msBeforeNext);
        }

        if (e instanceof Error) {
            throw new RateLimiterServerError(e.message);
        }

        throw new RateLimiterServerError(String(e));
    }
};

export const rateLimiterConsumeChatMessage = async (playerPublicId: string) => {
    await consume(chatMessageLimiter, playerPublicId);
};

export const rateLimiterConsumeChannelSlowMode = async (channelName: string, messagesPerMinute: number, playerPublicId: string) => {
    await consume(getChannelSlowModeLimiter(messagesPerMinute), `${channelName}:${playerPublicId}`);
};

export const rateLimiterConsumeAccountCreation = async (ip: string | undefined) => {
    if (ip) {
        await consume(accountCreationLimiter, ip);
    }
};

export const rateLimiterConsumeFailedLogin = async (ip: string | undefined) => {
    if (ip) {
        await consume(failedLoginLimiter, ip);
    }
};

export const rateLimiterConsumeCreateGame = async (playerPublicId: string) => {
    await consume(createGameLimiter, playerPublicId);
};

export const rateLimiterConsumeChallengePlayer = async (playerPublicId: string) => {
    await consume(challengePlayerLimiter, playerPublicId);
};

export const rateLimiterConsumeChallengeSameTarget = async (playerPublicId: string, targetPublicId: string) => {
    await consume(challengeSameTargetLimiter, `${playerPublicId}:${targetPublicId}`);
};

export const rateLimiterConsumeFailedApiKey = async (ip: string | undefined) => {
    if (ip) {
        await consume(failedApiKeyLimiter, ip);
    }
};

export const rateLimiterConsumeAnalyzePosition = async (ip: string | undefined) => {
    if (ip) {
        await consume(analyzePositionLimiter, ip);
    }
};

export const rateLimiterConsumeAnalyzePositionMcts = async (ip: string | undefined) => {
    if (ip) {
        await consume(analyzePositionMctsLimiter, ip);
    }
};

export const rateLimiterConsumeAnalyzeMoveMcts = async (playerPublicId: string) => {
    await consume(analyzeMoveMctsLimiter, playerPublicId);
};

export const rateLimiterConsumePuzzleKatahexCheck = async (playerPublicId: string) => {
    await consume(puzzleKatahexCheckLimiter, playerPublicId);
};

export const rateLimiterConsumeAiWorkerNextJob = async (aiWorkerKeyId: number) => {
    await consume(aiWorkerNextJobLimiter, String(aiWorkerKeyId));
};

export const rateLimiterConsumeLinkExternalAccount = async (playerPublicId: string) => {
    await consume(linkExternalAccountLimiter, playerPublicId);
};

export const rateLimiterConsumeImportExternalGames = async (playerPublicId: string) => {
    await consume(importExternalGamesLimiter, playerPublicId);
};
