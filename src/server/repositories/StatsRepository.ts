import { HostedGameToPlayer, PlayerStats } from '../../shared/app/models/index.js';
import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';

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
            .innerJoin('hostedGame.gameData', 'game')
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
            .select('gameOptions.ranked as ranked')
            .addSelect('count(*) as total')
            .innerJoin('hostedGame.gameOptions', 'gameOptions')
            .andWhere('gameOptions.opponentType = "player"')
            .groupBy('gameOptions.ranked')
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
            .innerJoin('hostedGame.gameOptions', 'gameOptions')
            .andWhere('gameOptions.opponentType = "ai"')
            .getCount()
        ;

        /*
         * Total played games by board size
         */
        const preferredBoardsizes: { boardsize: number, total: string }[] = await playedGamesQueryBuilder.clone()
            .select('gameOptions.boardsize as boardsize, count(*) as total')
            .innerJoin('hostedGame.gameOptions', 'gameOptions')
            .groupBy('gameOptions.boardsize')
            .orderBy('gameOptions.boardsize')
            .getRawMany()
        ;

        playerStats.preferredBoardsizes = {};

        for (const { boardsize, total } of preferredBoardsizes) {
            playerStats.preferredBoardsizes[boardsize] = Number(total);
        }

        return playerStats;
    }
}
