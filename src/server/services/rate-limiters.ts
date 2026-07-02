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
