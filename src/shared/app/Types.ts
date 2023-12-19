import { TimeControlValues } from 'time-control/TimeControlInterface';
import { PlayerIndex } from '../game-engine';
import { GameState, Outcome } from 'game-engine/Game';
import { GameOptionsData } from './GameOptions';

export type Tuple<T> = [T, T];

export type PlayerData = {
    id: string;
    pseudo: string;
    isBot: boolean;
};

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


export type HostedGameData = {
    id: string;
    host: PlayerData;
    opponent: null | PlayerData;
    gameOptions: GameOptionsData;
    timeControlValues: TimeControlValues;

    /**
     * gameData is null on server when game is not yet started.
     */
    gameData: null | GameData;
};

export type OnlinePlayerData = {
    playerData: PlayerData;
    connected: boolean;
};

export type OnlinePlayersData = {
    totalPlayers: number;
    players: { [key: string]: OnlinePlayerData };
};
