import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Game } from '../../shared/app/models/index.js';

/**
 * Max history depth, to prevent too heavy queries.
 */
const MAX_HISTORY_MS = 15 * 31 * 86400 * 1000;

/**
 * Live games waiting for an opponent in lobby, as:
 * [createdAt timestamp, timestamp when no longer in lobby (accepted or canceled), 1 if accepted else 0, moves count]
 */
export type LiveLobbyHistoryGame = [number, number, 0 | 1, number];

export type LiveLobbyHistory = {
    games: LiveLobbyHistoryGame[];
};

@Service()
export default class LiveLobbyHistoryRepository
{
    constructor(
        @Inject('Repository<Game>')
        private gameRepository: Repository<Game>,
    ) {}

    /**
     * Live games (initial time < 1 day) created by a player (not tournament or ladder matches),
     * open to anyone in lobby, and that left lobby after `since`:
     * either accepted by an opponent (startedAt), or canceled before (endedAt).
     *
     * Rematches are excluded: before july 2026 they had no opponentPublicId,
     * but were actually only joined by the previous opponent.
     */
    async getLiveLobbyHistory(since: Date): Promise<LiveLobbyHistory>
    {
        const minSince = new Date(Date.now() - MAX_HISTORY_MS);

        if (since < minSince) {
            since = minSince;
        }

        const rows: { createdAt: Date, startedAt: null | Date, endedAt: null | Date, movesCount: string | number }[] = await this.gameRepository.query(`
            select
                g.createdAt,
                g.startedAt,
                g.endedAt,
                case when g.moves = '' then 0 else length(g.moves) - length(replace(g.moves, ' ', '')) + 1 end as movesCount
            from game g
            where g.opponentType = 'player'
            and g.opponentPublicId is null
            and g.hostId is not null
            and g.rematchedFromId is null
            and g.state in ('ended', 'canceled')
            and cast(json_extract(g.timeControlType, '$.options.initialTime') as unsigned) < 86400000
            and coalesce(g.startedAt, g.endedAt) >= ?
            order by g.createdAt
        `, [since]);

        const games: LiveLobbyHistoryGame[] = [];

        for (const { createdAt, startedAt, endedAt, movesCount } of rows) {
            const closedAt = startedAt ?? endedAt;

            if (closedAt === null) {
                continue;
            }

            games.push([
                new Date(createdAt).getTime(),
                new Date(closedAt).getTime(),
                startedAt !== null ? 1 : 0,
                Number(movesCount),
            ]);
        }

        return { games };
    }
}
