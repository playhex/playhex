import { HostedGameToPlayer, PlayerHeadToHeadStats, PlayerStats } from '../../shared/app/models/index.js';
import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { timeControlToCadencyName } from '../../shared/app/timeControlUtils.js';
import type TimeControlType from '../../shared/time-control/TimeControlType.js';

@Service()
export default class StatsRepository
{
    constructor(
        @Inject('Repository<HostedGameToPlayer>')
        private hostedGameToPlayerRepository: Repository<HostedGameToPlayer>,
    ) {}

    async getPlayerStats(playerId: number): Promise<PlayerStats>
    {
        const playerStats = new PlayerStats();
        const playedGamesQueryBuilder = this.hostedGameToPlayerRepository
            .createQueryBuilder('hgp')
            .innerJoin('hgp.hostedGame', 'hostedGame')
            .where('hgp.playerId = :playerId')
            .andWhere('hostedGame.state = "ended"')
            .setParameters({ playerId })
        ;

        /*
         * Total played games
         */
        playerStats.totalPlayedGames = await playedGamesQueryBuilder.clone()
            .getCount()
        ;

        /*
         * Total played games by 1v1 ranked/unranked
         */
        const totalByRanked: { ranked: number, total: string }[] = await playedGamesQueryBuilder.clone()
            .select('hostedGame.ranked as ranked')
            .addSelect('count(*) as total')
            .andWhere('hostedGame.opponentType = "player"')
            .groupBy('hostedGame.ranked')
            .getRawMany()
        ;

        playerStats.totalFriendly = 0;
        playerStats.totalRanked = 0;

        for (const { ranked, total } of totalByRanked) {
            playerStats[ranked ? 'totalRanked' : 'totalFriendly'] = Number(total);
        }

        /*
         * Total bot games
         */
        playerStats.totalBotGames = await playedGamesQueryBuilder.clone()
            .andWhere('hostedGame.opponentType = "ai"')
            .getCount()
        ;

        /*
         * Total played games by board size
         */
        const preferredBoardsizes: { boardsize: number, total: string }[] = await playedGamesQueryBuilder.clone()
            .select('hostedGame.boardsize as boardsize, count(*) as total')
            .groupBy('hostedGame.boardsize')
            .orderBy('hostedGame.boardsize')
            .getRawMany()
        ;

        playerStats.preferredBoardsizes = {};

        for (const { boardsize, total } of preferredBoardsizes) {
            playerStats.preferredBoardsizes[boardsize] = Number(total);
        }

        return playerStats;
    }

    /**
     * Stats of a player against another player, from playerId point of view.
     *
     * Same games scope as getPlayerStats(): ended 1v1 games, ranked and friendly.
     */
    async getHeadToHeadStats(playerId: number, opponentId: number): Promise<PlayerHeadToHeadStats>
    {
        /*
         * Aggregation is done here and not in SQL because summing games durations
         * ("timestampdiff" on mysql, "extract(epoch from ...)" on postgres)
         * and guessing whether a game is live or correspondence
         * cannot be expressed in a portable way.
         * Number of rows is bounded by the number of games these two players played together.
         */
        const rows: {
            publicId: string;
            startedAt: null | Date;
            endedAt: null | Date;
            boardsize: number;
            timeControlType: TimeControlType;
            won: number;
        }[] = await this.hostedGameToPlayerRepository
            .createQueryBuilder('hgp')
            .comment('head to head stats')
            .innerJoin('hgp.hostedGame', 'hostedGame')
            .innerJoin(
                HostedGameToPlayer,
                'opponent',
                'opponent.hostedGameId = hgp.hostedGameId and opponent.order != hgp.order and opponent.playerId = :opponentId',
            )
            .select('hostedGame.publicId', 'publicId')
            .addSelect('hostedGame.startedAt', 'startedAt')
            .addSelect('hostedGame.endedAt', 'endedAt')
            .addSelect('hostedGame.boardsize', 'boardsize')
            .addSelect('hostedGame.timeControlType', 'timeControlType')
            .addSelect('case when hgp.order = hostedGame.winner then 1 else 0 end', 'won')
            .where('hgp.playerId = :playerId')
            .andWhere('hostedGame.state = :state')
            .andWhere('hostedGame.opponentType = :opponentType')
            .orderBy('hostedGame.endedAt', 'ASC')
            .setParameters({ playerId, opponentId, state: 'ended', opponentType: 'player' })
            .getRawMany()
        ;

        const headToHeadStats = new PlayerHeadToHeadStats();

        headToHeadStats.totalGames = rows.length;
        headToHeadStats.wonGames = 0;
        headToHeadStats.lostGames = 0;
        headToHeadStats.totalPlayTimeSeconds = 0;
        headToHeadStats.liveGames = 0;
        headToHeadStats.firstGamePublicId = null;
        headToHeadStats.firstGameEndedAt = null;
        headToHeadStats.lastGamePublicId = null;
        headToHeadStats.lastGameEndedAt = null;

        if (rows.length === 0) {
            return headToHeadStats;
        }

        for (const row of rows) {
            if (Number(row.won) > 0) {
                ++headToHeadStats.wonGames;
            } else {
                ++headToHeadStats.lostGames;
            }

            if (row.startedAt === null || row.endedAt === null) {
                continue;
            }

            const timeControlType = typeof row.timeControlType === 'string'
                ? JSON.parse(row.timeControlType) as TimeControlType
                : row.timeControlType
            ;

            if (timeControlToCadencyName({ timeControlType, boardsize: row.boardsize }) === 'correspondence') {
                continue;
            }

            ++headToHeadStats.liveGames;
            headToHeadStats.totalPlayTimeSeconds += Math.max(
                0,
                Math.round((new Date(row.endedAt).getTime() - new Date(row.startedAt).getTime()) / 1000),
            );
        }

        const firstGame = rows[0];
        const lastGame = rows[rows.length - 1];

        headToHeadStats.firstGamePublicId = firstGame.publicId;
        headToHeadStats.firstGameEndedAt = firstGame.endedAt === null ? null : new Date(firstGame.endedAt);
        headToHeadStats.lastGamePublicId = lastGame.publicId;
        headToHeadStats.lastGameEndedAt = lastGame.endedAt === null ? null : new Date(lastGame.endedAt);

        return headToHeadStats;
    }
}
