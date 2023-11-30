import { TimeControlValues } from 'time-control/TimeControlInterface';
import { PlayerIndex } from '../game-engine';
import { Outcome } from 'game-engine/Game';

export type PlayerData = {
    id: string;
    pseudo: string;
    isGuest: boolean;
};

export type MoveData = {
    row: number;
    col: number;
};

export type GameData = {
    players: [null | PlayerData, null | PlayerData];

    /**
     * Game created from data should not automatically start if this is true,
     * because maybe should wait for players ready again for loaded game for example,
     * but is useful for game loaded while playing.
     */
    started: boolean;

    size: number;
    movesHistory: MoveData[],
    currentPlayerIndex: PlayerIndex,
    winner: null | PlayerIndex,
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
    game: GameData;
    timeControl: TimeControlValues;
};

export type OnlinePlayerData = {
    playerData: PlayerData;
    connected: boolean;
};

export type OnlinePlayersData = {
    totalPlayers: number;
    players: { [key: string]: OnlinePlayerData };
};
