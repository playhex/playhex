import { PlayerIndex } from '../game-engine';

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

    /**
     * Serialized board:
     *      '...1..0..',
     *      '.110..000',
     *      ...
     */
    hexes: string[];
};


export type HostedGameData = {
    id: string;
    game: GameData;
};
