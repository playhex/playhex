import { GameTimeData } from '../time-control/TimeControl';
import TimeControlType from '../time-control/TimeControlType';

export type Tuple<T> = [T, T];

export type WithRequired<Type, Key extends keyof Type> = Type & {
    [Property in Key]-?: Type[Property];
};

export type TimeControlOptionsValues = {
    options: TimeControlType;
    values: GameTimeData;
};

export type HostedGameState =
    'created'
    | 'canceled'
    | 'playing'
    | 'ended'
;

export type GithubContributor = {
    username: string;
    link: string;
    avatarUrl: string;
};

export type WeblateContributor = {
    fullName: string;
    link?: `http${string}`;
};

export type WeblateContributors = {
    [lang: string]: WeblateContributor[];
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
