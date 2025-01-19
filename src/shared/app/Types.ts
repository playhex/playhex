import { GameTimeData } from '../time-control/TimeControl';
import TimeControlType from '../time-control/TimeControlType';
import { Translator } from './i18n/availableLocales';

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

export type PlayHexContributors = {
    github: GithubContributor[];
    weblate: WeblateContributors;
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
