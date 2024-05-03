import { GameTimeData } from '../time-control/TimeControl';
import { GameOptionsData } from './GameOptions';
import TimeControlType from '../time-control/TimeControlType';
import { PlayerSettings } from '@prisma/client';
import { GameData } from '../game-engine/Types';
import ChatMessage from './models/ChatMessage';
import Player from './models/Player';

export type Tuple<T> = [T, T];

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
    host: Player;
    players: Player[];
    gameOptions: GameOptionsData;
    timeControl: GameTimeData;
    state: HostedGameState;
    chatMessages: ChatMessage[];

    /**
     * gameData is null on server when game is not yet started.
     */
    gameData: null | GameData;

    createdAt: Date;
    rematchId: null | string;
};

export type OnlinePlayersData = {
    totalPlayers: number;
    players: { [key: string]: Player };
};

export type PlayerSettingsData = Omit<PlayerSettings, 'playerId'>;

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
