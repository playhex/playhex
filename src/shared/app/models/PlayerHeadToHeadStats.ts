import { Type } from 'class-transformer';
import { Expose } from '../class-transformer-custom.js';

/**
 * Stats of a player against another player.
 * All values are from the point of view of the first player.
 *
 * played game: same definition as PlayerStats, i.e a 1v1 game that has ended.
 * Canceled games and bot games are not counted.
 */
export default class PlayerHeadToHeadStats
{
    /**
     * Total games played together
     */
    @Expose()
    totalGames: number;

    /**
     * Games won by the first player
     */
    @Expose()
    wonGames: number;

    /**
     * Games won by the opponent
     */
    @Expose()
    lostGames: number;

    /**
     * publicId of the first game they played together, to link to it.
     * null when they never played together.
     */
    @Expose()
    firstGamePublicId: null | string;

    @Expose()
    @Type(() => Date)
    firstGameEndedAt: null | Date;

    /**
     * publicId of the last game they played together, to link to it.
     * Same as firstGamePublicId when they played a single game together.
     */
    @Expose()
    lastGamePublicId: null | string;

    @Expose()
    @Type(() => Date)
    lastGameEndedAt: null | Date;

    /**
     * Sum of games durations, in seconds.
     * Only live games are counted: in correspondence,
     * elapsed time between game start and game end
     * is not relevant to how long they actually played together.
     */
    @Expose()
    totalPlayTimeSeconds: number;

    /**
     * Number of games counted in totalPlayTimeSeconds.
     */
    @Expose()
    liveGames: number;
}
