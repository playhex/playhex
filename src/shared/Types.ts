export type PlayerData = {
    id: string;
};

export type GameData = {
    id: string;
    players: [PlayerData, PlayerData];
};
