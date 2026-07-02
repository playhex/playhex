export type RateLimitReachedErrorPayload = {
    type: 'rate_limit_reached';
    rateLimiterName: string;
    nextActionAvailableInMs: number;
};

export const isRateLimitReachedErrorPayload = (payload: unknown): payload is RateLimitReachedErrorPayload => {
    return typeof payload === 'object'
        && payload !== null
        && typeof (payload as RateLimitReachedErrorPayload).type === 'string'
        && (payload as RateLimitReachedErrorPayload).type === 'rate_limit_reached'
    ;
};
