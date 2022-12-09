import BoardState from './BoardState';

export type PlayerIndex = 0 | 1;
export type Side = 'TOP' | 'LEFT' | 'BOTTOM' | 'RIGHT';
export type PlayerInfo = {
    pseudo: string,
};
export type BoardInfo = {
    size: number,
    hexes: (null|PlayerIndex)[][],
    currentPlayerIndex: PlayerIndex,
    winner: null|PlayerIndex,
};
export type GameInfo = {
    players: [PlayerInfo, PlayerInfo],
    board: BoardInfo,
};
