import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Game } from '../../shared/app/models/index.js';

/**
 * A finished game between two humans.
 */
export type AdminStatsHumanGame = {
    createdAt: number;
    startedAt: null | number;
    endedAt: number;

    /** Initial time less than one day, else correspondence */
    live: boolean;

    ranked: boolean;
    movesCount: number;

    /** Whether a rematch of this game has been started */
    rematched: boolean;

    playerIds: [number, number];
};

/**
 * A player who played at least one game against a human.
 */
export type AdminStatsPlayer = {
    /** Is still a guest now */
    isGuest: boolean;
    createdAt: number;
    registeredAt: null | number;
};

/**
 * Live game created by a player and open to anyone in lobby.
 */
export type AdminStatsLobbyGame = {
    hostId: number;
    createdAt: number;

    /** Accepted or canceled */
    closedAt: number;

    accepted: boolean;
};

export type AdminStatsRawData = {
    humanGames: AdminStatsHumanGame[];
    players: Map<number, AdminStatsPlayer>;
    lobbyGames: AdminStatsLobbyGame[];

    /** Finished games against a bot, with at least ADMIN_STATS_PLAYED_MIN_MOVES moves, by UTC day: [day timestamp, count] */
    botGamesByDay: [number, number][];

    /** New players by UTC day: [day timestamp, created as guest, created as account directly] */
    newPlayersByDay: [number, number, number][];

    /**
     * New guests who finished a game (against a human or a bot) with at least ADMIN_STATS_PLAYED_MIN_MOVES moves,
     * by UTC day of creation: [day timestamp, count]
     */
    newPlayingGuestsByDay: [number, number][];

    /** Guests upgraded to account by UTC day: [day timestamp, count] */
    guestUpgradesByDay: [number, number][];

    /** Ranked games between humans: [endedAt, absolute rating difference before game] */
    rankedRatingGaps: [number, number][];
};

/**
 * A player registered within this delay after creation created an account directly,
 * else was a guest first.
 */
const DIRECT_SIGNUP_MAX_SECONDS = 60;

/**
 * Games with less moves are considered aborted, not really played.
 */
export const ADMIN_STATS_PLAYED_MIN_MOVES = 4;

/**
 * Sql condition on game `g` having at least ADMIN_STATS_PLAYED_MIN_MOVES moves (moves are separated by spaces).
 */
const PLAYED_GAME_CONDITION = `length(g.moves) - length(replace(g.moves, ' ', '')) >= ${ADMIN_STATS_PLAYED_MIN_MOVES - 1}`;

const toMs = (date: Date | string): number => new Date(date).getTime();

const utcDay = (day: Date | string): number => {
    if (day instanceof Date) {
        return Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
    }

    return Date.parse(day + 'T00:00:00Z');
};

/**
 * Raw data for admin stats (activity, retention, lobby...).
 * Heavy queries, results should be cached.
 */
@Service()
export default class AdminStatsRepository
{
    constructor(
        @Inject('Repository<Game>')
        private gameRepository: Repository<Game>,
    ) {}

    /**
     * @param since Most data are fetched since this date, except human games which are all fetched,
     *              to know when each player played his first game.
     */
    async getRawData(since: Date): Promise<AdminStatsRawData>
    {
        const [{ humanGames, players }, lobbyGames, botGamesByDay, newPlayersByDay, newPlayingGuestsByDay, guestUpgradesByDay, rankedRatingGaps] = await Promise.all([
            this.getHumanGames(),
            this.getLobbyGames(since),
            this.getBotGamesByDay(since),
            this.getNewPlayersByDay(since),
            this.getNewPlayingGuestsByDay(since),
            this.getGuestUpgradesByDay(since),
            this.getRankedRatingGaps(since),
        ]);

        return { humanGames, players, lobbyGames, botGamesByDay, newPlayersByDay, newPlayingGuestsByDay, guestUpgradesByDay, rankedRatingGaps };
    }

    /**
     * straight_join: else mysql scans all game_to_player first.
     */
    private async getHumanGames(): Promise<{ humanGames: AdminStatsHumanGame[], players: Map<number, AdminStatsPlayer> }>
    {
        const rows: {
            createdAt: Date;
            startedAt: null | Date;
            endedAt: Date;
            live: string | number;
            ranked: string | number;
            movesCount: string | number;
            rematched: string | number;
            p0: number;
            p1: number;
            guest0: string | number;
            guest1: string | number;
            createdAt0: Date;
            createdAt1: Date;
            registeredAt0: null | Date;
            registeredAt1: null | Date;
        }[] = await this.gameRepository.query(`
            select straight_join
                g.createdAt,
                g.startedAt,
                g.endedAt,
                coalesce(cast(json_extract(g.timeControlType, '$.options.initialTime') as unsigned) < 86400000, 1) as live,
                g.ranked,
                case when g.moves is null or g.moves = '' then 0 else length(g.moves) - length(replace(g.moves, ' ', '')) + 1 end as movesCount,
                r.startedAt is not null as rematched,
                p0.id as p0,
                p1.id as p1,
                p0.isGuest as guest0,
                p1.isGuest as guest1,
                p0.createdAt as createdAt0,
                p1.createdAt as createdAt1,
                p0.registeredAt as registeredAt0,
                p1.registeredAt as registeredAt1
            from game g
            join game_to_player gp0 on gp0.gameId = g.id and gp0.order = 0
            join game_to_player gp1 on gp1.gameId = g.id and gp1.order = 1
            join player p0 on p0.id = gp0.playerId
            join player p1 on p1.id = gp1.playerId
            left join game r on r.id = g.rematchId
            where g.opponentType = 'player'
            and g.state = 'ended'
            and g.endedAt is not null
            order by g.endedAt
        `);

        const humanGames: AdminStatsHumanGame[] = [];
        const players = new Map<number, AdminStatsPlayer>();

        for (const row of rows) {
            humanGames.push({
                createdAt: toMs(row.createdAt),
                startedAt: row.startedAt === null ? null : toMs(row.startedAt),
                endedAt: toMs(row.endedAt),
                live: Number(row.live) === 1,
                ranked: Number(row.ranked) === 1,
                movesCount: Number(row.movesCount),
                rematched: Number(row.rematched) === 1,
                playerIds: [row.p0, row.p1],
            });

            players.set(row.p0, {
                isGuest: Number(row.guest0) === 1,
                createdAt: toMs(row.createdAt0),
                registeredAt: row.registeredAt0 === null ? null : toMs(row.registeredAt0),
            });

            players.set(row.p1, {
                isGuest: Number(row.guest1) === 1,
                createdAt: toMs(row.createdAt1),
                registeredAt: row.registeredAt1 === null ? null : toMs(row.registeredAt1),
            });
        }

        return { humanGames, players };
    }

    /**
     * Same games as in LiveLobbyHistoryRepository.
     */
    private async getLobbyGames(since: Date): Promise<AdminStatsLobbyGame[]>
    {
        const rows: { hostId: number, createdAt: Date, startedAt: null | Date, endedAt: Date }[] = await this.gameRepository.query(`
            select g.hostId, g.createdAt, g.startedAt, g.endedAt
            from game g
            where g.opponentType = 'player'
            and g.opponentPublicId is null
            and g.hostId is not null
            and g.rematchedFromId is null
            and g.state in ('ended', 'canceled')
            and cast(json_extract(g.timeControlType, '$.options.initialTime') as unsigned) < 86400000
            and g.endedAt >= ?
            and g.createdAt >= ?
            order by g.createdAt
        `, [since, since]);

        return rows.map(row => ({
            hostId: row.hostId,
            createdAt: toMs(row.createdAt),
            closedAt: toMs(row.startedAt ?? row.endedAt),
            accepted: row.startedAt !== null,
        }));
    }

    private async getBotGamesByDay(since: Date): Promise<[number, number][]>
    {
        const rows: { day: Date | string, n: string | number }[] = await this.gameRepository.query(`
            select date(g.endedAt) as day, count(*) as n
            from game g
            where g.opponentType = 'ai'
            and g.state = 'ended'
            and g.endedAt >= ?
            and ${PLAYED_GAME_CONDITION}
            group by day
        `, [since]);

        return rows.map(row => [utcDay(row.day), Number(row.n)]);
    }

    private async getNewPlayersByDay(since: Date): Promise<[number, number, number][]>
    {
        const rows: { day: Date | string, guests: string | number, accounts: string | number }[] = await this.gameRepository.query(`
            select
                date(p.createdAt) as day,
                sum(p.registeredAt is null or p.registeredAt > p.createdAt + interval ${DIRECT_SIGNUP_MAX_SECONDS} second) as guests,
                sum(p.registeredAt is not null and p.registeredAt <= p.createdAt + interval ${DIRECT_SIGNUP_MAX_SECONDS} second) as accounts
            from player p
            where p.isBot = 0
            and p.createdAt >= ?
            group by day
        `, [since]);

        return rows.map(row => [utcDay(row.day), Number(row.guests), Number(row.accounts)]);
    }

    /**
     * From games side: games are much less than guests.
     */
    private async getNewPlayingGuestsByDay(since: Date): Promise<[number, number][]>
    {
        const rows: { day: Date | string, n: string | number }[] = await this.gameRepository.query(`
            select straight_join date(p.createdAt) as day, count(distinct p.id) as n
            from game g
            join game_to_player gp on gp.gameId = g.id
            join player p on p.id = gp.playerId
            where g.state = 'ended'
            and g.endedAt >= ?
            and ${PLAYED_GAME_CONDITION}
            and p.isBot = 0
            and p.createdAt >= ?
            and (p.registeredAt is null or p.registeredAt > p.createdAt + interval ${DIRECT_SIGNUP_MAX_SECONDS} second)
            group by day
        `, [since, since]);

        return rows.map(row => [utcDay(row.day), Number(row.n)]);
    }

    private async getGuestUpgradesByDay(since: Date): Promise<[number, number][]>
    {
        const rows: { day: Date | string, n: string | number }[] = await this.gameRepository.query(`
            select date(p.registeredAt) as day, count(*) as n
            from player p
            where p.isBot = 0
            and p.registeredAt >= ?
            and p.registeredAt > p.createdAt + interval ${DIRECT_SIGNUP_MAX_SECONDS} second
            group by day
        `, [since]);

        return rows.map(row => [utcDay(row.day), Number(row.n)]);
    }

    /**
     * Ratings are not linked to games, but are created when game ends.
     * Rating before game is rating after game minus rating change.
     */
    private async getRankedRatingGaps(since: Date): Promise<[number, number][]>
    {
        const rows: { id: number, endedAt: Date, gap: string | number }[] = await this.gameRepository.query(`
            select straight_join
                g.id,
                g.endedAt,
                abs((r0.rating - r0.ratingChange) - (r1.rating - r1.ratingChange)) as gap
            from game g
            join game_to_player gp0 on gp0.gameId = g.id and gp0.order = 0
            join game_to_player gp1 on gp1.gameId = g.id and gp1.order = 1
            join rating r0 on r0.playerId = gp0.playerId and r0.category = 'overall'
                and r0.createdAt between g.endedAt - interval 2 second and g.endedAt + interval 2 second
            join rating r1 on r1.playerId = gp1.playerId and r1.category = 'overall'
                and r1.createdAt between g.endedAt - interval 2 second and g.endedAt + interval 2 second
            where g.opponentType = 'player'
            and g.state = 'ended'
            and g.ranked = 1
            and g.endedAt >= ?
        `, [since]);

        // A player may have 2 games ended within 2 seconds, keep only one rating
        const gaps = new Map<number, [number, number]>();

        for (const row of rows) {
            if (!gaps.has(row.id)) {
                gaps.set(row.id, [toMs(row.endedAt), Number(row.gap)]);
            }
        }

        return [...gaps.values()];
    }
}
