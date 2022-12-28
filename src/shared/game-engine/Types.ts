export type PlayerIndex = 0 | 1;

export type Coords = {
    row: number,
    col: number,
};

export type PathItem = {
    parent: null | PathItem,
    cell: Coords,
};

export type PlayerData = {
    id: string;
};

export type GameData = {
    players: [PlayerData, PlayerData];

    /**
     * Game created from data should not automatically start if this is true,
     * because maybe should wait for players ready again for loaded game for example,
     * but is useful for game loaded while playing.
     */
    started: boolean;

    size: number;
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

export type MoveData = {
    row: number;
    col: number;
};
