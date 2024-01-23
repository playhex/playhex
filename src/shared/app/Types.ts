import { GameTimeData } from '../time-control/TimeControl';
import { PlayerIndex } from '../game-engine';
import { GameState, Outcome } from 'game-engine/Game';
import { GameOptionsData } from './GameOptions';
import TimeControlType from '../time-control/TimeControlType';
import { Player } from '@prisma/client';

export type Tuple<T> = [T, T];

/**
 * All data about a player used on server and client side.
 * Exclude password, email...
 */
export type PlayerData = Pick<Player,
    'pseudo'
    | 'slug'
    | 'publicId'
    | 'isGuest'
    | 'isBot'
    | 'createdAt'
>;

export type MoveData = {
    row: number;
    col: number;
};

export type GameData = {
    players: Tuple<PlayerData>;

    /**
     * Game created from data should not automatically start if this is true,
     * because maybe should wait for players ready again for loaded game for example,
     * but is useful for game loaded while playing.
     */
    started: boolean;

    state: GameState;

    size: number;
    movesHistory: MoveData[];
    allowSwap: boolean;
    currentPlayerIndex: PlayerIndex;
    winner: null | PlayerIndex;
    outcome: null | Outcome;

    /**
     * Serialized board:
     *      '...1..0..',
     *      '.110..000',
     *      ...
     */
    hexes: string[];

    createdAt: Date;
    startedAt: null | Date;
    lastMoveAt: null | Date;
    endedAt: null | Date;
};

export type TimeControlOptionsValues = {
    options: TimeControlType;
    values: GameTimeData;
};

export type HostedGameData = {
    id: string;
    host: PlayerData;
    opponent: null | PlayerData;
    gameOptions: GameOptionsData;
    timeControl: TimeControlOptionsValues;

    /**
     * Whether game has been canceled.
     * We can guess a game is canceled also by checking gameData,
     * but this attribute is still required when game is canceled
     * before game started, and gameData is null.
     */
    canceled: boolean;

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
