import { GameTimeData } from '../time-control/TimeControl.js';
import TimeControlType from '../time-control/TimeControlType.js';
import { Translator } from './i18n/availableLocales.js';
import { RateLimitReachedErrorPayload } from './rate-limiters.js';

export type Tuple<T> = [T, T];

export type WithRequired<Type, Key extends keyof Type> = Type & {
    [Property in Key]-?: Type[Property];
};

export type TimeControlOptionsValues = {
    options: TimeControlType;
    values: GameTimeData;
};

export const hostedGameStates = [
    'created',
    'canceled',
    'playing',
    'ended',
] as const;

export type HostedGameState = typeof hostedGameStates[number];

export type GithubContributor = {
    username: string;
    link: string;
    avatarUrl: string;
};

export type WeblateContributors = {
    [lang: string]: Translator[];
};

export type LiberapayPatron = {
    /**
     * Used to create url to patron's profile page
     */
    username: string;

    publicName?: string;

    /**
     * Should fallback to https://liberapay.com/assets/avatar-default.png
     */
    avatar?: string;
};

export type PlayHexContributors = {
    github: GithubContributor[];
    weblate: WeblateContributors;
    liberapay: LiberapayPatron[];
};

export type AIConfigStatusData = {
    /**
     * Whether remote AIs can be run (AIConfig: "isRemote")
     */
    aiApiAvailable: boolean;

    /**
     * Whether powerful AIs can be run (AIConfig: "requireMorePower")
     */
    powerfulPeerAvailable: boolean;
};

type TWebsocketActionError<Reason extends string = string, Payload = unknown> = {
    reason: Reason;
    payload: Payload;
};

export type WebsocketActionError =
    // Rate limiter error (displayed to player)
    | TWebsocketActionError<'rate_limited', RateLimitReachedErrorPayload>

    // Generic error payload, displayed to player
    | TWebsocketActionError<'client_error', { translationKey: string }>

    // Generic system error, should not occur, not displayed to player
    | { reason: 'server_error' }
;
