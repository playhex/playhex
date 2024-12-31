import { Expose } from '../class-transformer-custom';

/**
 * Player stats: played games, preferred settings...
 *
 * played game: a game that has finished (not canceled, with at least 4 moves, swap included).
 */
export default class PlayerStats
{
    @Expose()
    totalPlayedGames: number;

    /**
     * total 1v1 ranked played games
     */
    @Expose()
    totalRanked: number;

    /**
     * total 1v1 unranked played games
     */
    @Expose()
    totalFriendly: number;

    @Expose()
    totalBotGames: number;

    /**
     * Games played by board sizes. Example:
     * `{'11': 201, '14': 132, '15': 3}`
     */
    @Expose()
    preferredBoardsizes: { [boardsize: string]: number };
}
