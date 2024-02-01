import { GameTimeData } from '../time-control/TimeControl';
import { GameOptionsData } from './GameOptions';
import TimeControlType from '../time-control/TimeControlType';
import { Player, PlayerSettings } from '@prisma/client';
import { GameData } from '../game-engine/Types';

export type Tuple<T> = [T, T];

/**
 * All data about a player used on server and client side.
 * Exclude password, email...
 */
export type PlayerData = Pick<Player,
    /**
     * Used for displays
     */
    'pseudo'

    /**
     * Used for link to profile page, SGF file name
     */
    | 'slug'

    /**
     * Used to identify a player
     */
    | 'publicId'

    /**
     * Show an italized "Guest" before pseudo
     */
    | 'isGuest'

    /**
     * Used to know that we use an AI to generate moves. Show a robot icon before pseudo
     */
    | 'isBot'

    /**
     * Displayed on profile page
     */
    | 'createdAt'
>;

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

export type HostedGameData = {
    id: string;
    host: PlayerData;
    players: PlayerData[];
    gameOptions: GameOptionsData;
    timeControl: TimeControlOptionsValues;
    state: HostedGameState;

    /**
     * gameData is null on server when game is not yet started.
     */
    gameData: null | GameData;

    createdAt: Date;
};

export type OnlinePlayersData = {
    totalPlayers: number;
    players: { [key: string]: PlayerData };
};

export type PlayerSettingsData = Pick<PlayerSettings,
    'confirmMoveBlitz'
    | 'confirmMoveNormal'
    | 'confirmMoveCorrespondance'
>;
