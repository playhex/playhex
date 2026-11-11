import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Game, MatchmakingEvent, Player } from '../../shared/app/models/index.js';
import { calcMatchmakingStreak, type MatchmakingEventType } from '../../shared/app/matchmaking/matchmakingRules.js';
import logger from '../services/logger.js';
import { errorToLogger } from '../../shared/app/utils.js';

export type MatchmakingStats = {
    gamesCount: number;
    streak: number;
};

@Service()
export default class MatchmakingEventRepository
{
    constructor(
        @Inject('Repository<MatchmakingEvent>')
        private matchmakingEventRepository: Repository<MatchmakingEvent>,
    ) {}

    /**
     * Fire and forget: never awaited, never throws, adds no latency.
     */
    log(
        type: MatchmakingEventType,
        player: Player,
        parameters: MatchmakingEvent['parameters'],
        otherPlayer: null | Player = null,
        game: null | Game = null,
    ): void {
        if (player.id === undefined) {
            logger.warning('Matchmaking: cannot log event, player has no id', { type, player: player.publicId });
            return;
        }

        const event = new MatchmakingEvent();

        event.type = type;
        event.playerId = player.id;
        event.otherPlayer = otherPlayer?.id !== undefined ? { id: otherPlayer.id } as Player : null;
        event.game = game?.id !== undefined ? { id: game.id } as Game : null;
        event.parameters = parameters;
        event.createdAt = new Date();

        this.matchmakingEventRepository
            .save(event, { reload: false })
            .catch(e => logger.warning('Matchmaking: could not log event', { type, ...errorToLogger(e) }))
        ;
    }

    async getStats(player: Player, now = new Date()): Promise<MatchmakingStats>
    {
        if (player.id === undefined) {
            return { gamesCount: 0, streak: 0 };
        }

        const rows: { day: string, count: string }[] = await this.matchmakingEventRepository
            .createQueryBuilder('e')
            .select('DATE_FORMAT(e.createdAt, \'%Y-%m-%d\')', 'day')
            .addSelect('COUNT(*)', 'count')
            .where('e.type = \'match\'')
            .andWhere('(e.playerId = :id OR e.otherPlayerId = :id)', { id: player.id })
            .groupBy('day')
            .getRawMany()
        ;

        return {
            gamesCount: rows.reduce((sum, row) => sum + Number(row.count), 0),
            streak: calcMatchmakingStreak(rows.map(row => row.day), now),
        };
    }
}
