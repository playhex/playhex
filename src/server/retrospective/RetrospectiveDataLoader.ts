import { DataSource } from 'typeorm';
import type { Rating } from '../../shared/app/models/index.js';
import type { GameAnalyzeData } from '../../shared/app/models/GameAnalyze.js';
import type TimeControlType from '../../shared/time-control/TimeControlType.js';
import { isRatingConfident } from '../../shared/app/ratingUtils.js';
import { isRetrospectiveEligible, retrospectiveYearRange } from '../../shared/app/retrospective/retrospectiveRules.js';
import type { RetrospectivePlayerRef, RetrospectiveTournament } from '../../shared/app/retrospective/retrospectiveTypes.js';

/**
 * Game analyzes json are heavy, load them by chunks.
 */
const ANALYZE_CHUNK_SIZE = 100;

/**
 * Max number of ids in a "IN (?)" query.
 */
const IDS_CHUNK_SIZE = 500;

export type PlayerRow = {
    id: number;
    publicId: string;
    pseudo: string;
    slug: string;
    isBot: number;
    createdAt: Date;
    registeredAt: null | Date;
};

/**
 * A game ended by a player, from this player point of view.
 */
export type GameRow = {
    id: number;
    publicId: string;
    opponentType: 'player' | 'ai';
    ranked: number;
    boardsize: number;
    swapRule: number;
    timeControlType: string | TimeControlType;
    startedAt: null | Date;
    endedAt: Date;
    winner: null | number;
    outcome: null | string;
    moves: null | string;
    moveTimestamps: null | string;

    /**
     * Player position in game: 0 if played first.
     */
    order: number;

    opponentId: null | number;
    opponentPublicId: null | string;
    opponentPseudo: null | string;
    opponentSlug: null | string;
    opponentIsBot: null | number;
    opponentIsGuest: null | number;
    tournamentRound: null | number;
    tournamentMatchNumber: null | number;
    tournamentMatchLabel: null | string;
    tournamentPublicId: null | string;
    tournamentTitle: null | string;
    ladderId: null | number;
    defenderPositionBefore: null | number;
};

export type BotRow = RetrospectivePlayerRef & { rating: number };

export type LadderRow = { id: number, slug: string, name: string };

export type LadderChallengeRow = {
    ladderId: number;
    endedAt: Date;
    challengerId: number;
    defenderId: number;
    result: null | string;
    challengerPositionBefore: null | number;
    challengerPositionAfter: null | number;
    defenderPositionBefore: null | number;
    defenderPositionAfter: null | number;
};

export type LadderReignRow = { ladderId: number, playerId: number, startedAt: Date, endedAt: null | Date };

/**
 * Data loaded once for all players of a year.
 */
export type YearContext = {
    year: number;
    from: Date;
    to: Date;
    chatMessagesByPlayer: Map<number, number>;
    tournamentsByPlayer: Map<number, RetrospectiveTournament[]>;
    botRatings: Map<number, number>;
    ladders: Map<number, LadderRow>;
    ladderChallengesByPlayer: Map<number, LadderChallengeRow[]>;
    ladderReignsByPlayer: Map<number, LadderReignRow[]>;
};

/**
 * Values of a retrospective used to compute "top X%".
 */
export type PercentileValuesRow = {
    playerId: number;
    hidden: boolean;
    games1v1: number;
    livePlaySeconds: number;
    activeDays: number;
    chatMessages: number;
    rankedWins: number;
    endRating: null | number;
    accuracy: null | number;
    movesPlayed: number;
    liveThinkingSeconds: number;
};

const pushToMap = <K, V>(map: Map<K, V[]>, key: K, value: V): void => {
    const values = map.get(key);

    if (values) {
        values.push(value);
    } else {
        map.set(key, [value]);
    }
};

const parseJson = <T>(value: string | T): T => typeof value === 'string' ? JSON.parse(value) as T : value;

const chunks = <T>(values: T[], size: number): T[][] => {
    const result: T[][] = [];

    for (let i = 0; i < values.length; i += size) {
        result.push(values.slice(i, i + size));
    }

    return result;
};

export const isEligible = (player: PlayerRow, year: number, gamesCount: number): boolean => isRetrospectiveEligible({
    isBot: !!player.isBot,
    slug: player.slug,
    createdAt: new Date(player.createdAt),
    registeredAt: player.registeredAt === null ? null : new Date(player.registeredAt),
}, year, gamesCount);

/**
 * Database queries needed to compute retrospectives.
 * Raw queries: retrospectives scan a whole year of games, entities would be too slow.
 */
export default class RetrospectiveDataLoader
{
    private yearContexts = new Map<number, YearContext>();

    constructor(
        private dataSource: DataSource,
    ) {}

    /**
     * Players eligible to a retrospective this year, see isRetrospectiveEligible().
     */
    async findEligiblePlayerIds(year: number): Promise<number[]>
    {
        const { from, to } = retrospectiveYearRange(year);

        // Players who ended a game this year, then filtered with same rule as compute()
        const rows: PlayerRow[] = await this.dataSource.query(`
            SELECT p.id AS id, p.publicId AS publicId, p.pseudo AS pseudo, p.slug AS slug, p.isBot AS isBot, p.createdAt AS createdAt, p.registeredAt AS registeredAt
            FROM player p
            WHERE NOT p.isBot
            AND p.registeredAt IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM game_to_player gp
                JOIN game g ON g.id = gp.gameId
                WHERE gp.playerId = p.id
                AND g.state = 'ended'
                AND g.endedAt >= ? AND g.endedAt < ?
            )
            ORDER BY p.id
        `, [from, to]);

        return rows
            .filter(row => isEligible(row, year, 1))
            .map(row => row.id)
        ;
    }

    /**
     * Whether player has played at least one game in this year.
     */
    async hasPlayed(playerId: number, year: number): Promise<boolean>
    {
        const { from, to } = retrospectiveYearRange(year);

        const rows: unknown[] = await this.dataSource.query(`
            SELECT 1
            FROM game_to_player gp
            JOIN game g ON g.id = gp.gameId
            WHERE gp.playerId = ?
            AND g.state = 'ended'
            AND g.endedAt >= ? AND g.endedAt < ?
            LIMIT 1
        `, [playerId, from, to]);

        return rows.length > 0;
    }

    async loadPlayer(playerId: number): Promise<null | PlayerRow>
    {
        const [player]: PlayerRow[] = await this.dataSource.query(`
            SELECT id, publicId, pseudo, slug, isBot, createdAt, registeredAt
            FROM player
            WHERE id = ?
        `, [playerId]);

        return player ?? null;
    }

    /**
     * Games ended by player in [from, to[, oldest first.
     * Tournament data excludes canceled and hidden tournaments, ladder data excludes voided challenges.
     */
    async loadGames(playerId: number, from: Date, to: Date): Promise<GameRow[]>
    {
        return await this.dataSource.query(`
            SELECT
                g.id AS id,
                g.publicId AS publicId,
                g.opponentType AS opponentType,
                g.ranked AS ranked,
                g.boardsize AS boardsize,
                g.swapRule AS swapRule,
                g.timeControlType AS timeControlType,
                g.startedAt AS startedAt,
                g.endedAt AS endedAt,
                g.winner AS winner,
                g.outcome AS outcome,
                g.moves AS moves,
                g.moveTimestamps AS moveTimestamps,
                gp.\`order\` AS \`order\`,
                op.id AS opponentId,
                op.publicId AS opponentPublicId,
                op.pseudo AS opponentPseudo,
                op.slug AS opponentSlug,
                op.isBot AS opponentIsBot,
                op.isGuest AS opponentIsGuest,
                tm.round AS tournamentRound,
                tm.number AS tournamentMatchNumber,
                tm.label AS tournamentMatchLabel,
                t.publicId AS tournamentPublicId,
                t.title AS tournamentTitle,
                lc.ladderId AS ladderId,
                lc.defenderPositionBefore AS defenderPositionBefore
            FROM game_to_player gp
            JOIN game g ON g.id = gp.gameId
            LEFT JOIN game_to_player ogp ON ogp.gameId = g.id AND ogp.\`order\` != gp.\`order\`
            LEFT JOIN player op ON op.id = ogp.playerId
            LEFT JOIN (
                tournament_match tm
                JOIN tournament t ON t.id = tm.tournamentId AND t.canceledAt IS NULL AND t.hidden = 0
            ) ON tm.gameId = g.id
            LEFT JOIN ladder_challenge lc ON lc.gameId = g.id AND lc.result IS NOT NULL AND lc.result != 'voided'
            WHERE gp.playerId = ?
            AND g.state = 'ended'
            AND g.endedAt >= ? AND g.endedAt < ?
            ORDER BY g.endedAt
        `, [playerId, from, to]);
    }

    /**
     * Overall rating at end of year, only if confident.
     * Queried per player: a query for all players would scan the whole rating table.
     */
    async loadEndRating(playerId: number, to: Date): Promise<null | number>
    {
        const [row]: { rating: number, deviation: number }[] = await this.dataSource.query(`
            SELECT rating, deviation
            FROM rating
            WHERE playerId = ?
            AND category = 'overall'
            AND createdAt < ?
            ORDER BY createdAt DESC, id DESC
            LIMIT 1
        `, [playerId, to]);

        return row && isRatingConfident({ deviation: row.deviation } as Rating) ? row.rating : null;
    }

    /**
     * Current overall rating of players, only if confident.
     */
    async loadCurrentRatings(playerIds: number[]): Promise<Map<number, number>>
    {
        const ratings = new Map<number, number>();

        for (const ids of chunks([...new Set(playerIds)], IDS_CHUNK_SIZE)) {
            const rows: { id: number, rating: number, deviation: number }[] = await this.dataSource.query(`
                SELECT p.id AS id, r.rating AS rating, r.deviation AS deviation
                FROM player p
                JOIN rating r ON r.id = p.currentRatingId
                WHERE p.id IN (?)
            `, [ids]);

            for (const row of rows) {
                if (isRatingConfident({ deviation: row.deviation } as Rating)) {
                    ratings.set(row.id, row.rating);
                }
            }
        }

        return ratings;
    }

    /**
     * Overall rating of opponent before each game, for ranked games.
     *
     * @returns Rating by game id
     */
    async loadOpponentRatingsBeforeGames(games: GameRow[]): Promise<Map<number, number>>
    {
        const ratings = new Map<number, number>();
        const rankedGames = games.filter(game => game.ranked && game.opponentId !== null);

        for (const chunk of chunks(rankedGames, IDS_CHUNK_SIZE)) {
            const rows: { gameId: number, playerId: number, rating: number, ratingChange: null | number }[] = await this.dataSource.query(`
                SELECT rgg.gameId AS gameId, r.playerId AS playerId, r.rating AS rating, r.ratingChange AS ratingChange
                FROM rating_games_game rgg
                JOIN rating r ON r.id = rgg.ratingId
                WHERE rgg.gameId IN (?)
                AND r.category = 'overall'
            `, [chunk.map(game => game.id)]);

            const opponentByGame = new Map(chunk.map(game => [game.id, game.opponentId]));

            for (const row of rows) {
                if (opponentByGame.get(row.gameId) === row.playerId) {
                    ratings.set(row.gameId, row.rating - (row.ratingChange ?? 0));
                }
            }
        }

        return ratings;
    }

    /**
     * Calls callback for each game that has been analyzed.
     */
    async forEachAnalyze(games: GameRow[], callback: (game: GameRow, analyze: GameAnalyzeData) => void): Promise<void>
    {
        const gamesById = new Map(games.map(game => [game.id, game]));

        for (const chunk of chunks(games, ANALYZE_CHUNK_SIZE)) {
            const rows: { gameId: number, analyze: string | GameAnalyzeData }[] = await this.dataSource.query(`
                SELECT ga.gameId AS gameId, ga.\`analyze\` AS \`analyze\`
                FROM game_analyze ga
                WHERE ga.gameId IN (?)
                AND ga.\`analyze\` IS NOT NULL
            `, [chunk.map(game => game.id)]);

            for (const row of rows) {
                const analyze = parseJson(row.analyze);
                const game = gamesById.get(row.gameId);

                if (game && Array.isArray(analyze)) {
                    callback(game, analyze);
                }
            }
        }
    }

    /**
     * Bots that played this year, with their current overall rating.
     */
    async loadActiveBots(year: number): Promise<BotRow[]>
    {
        const { from, to } = retrospectiveYearRange(year);

        return await this.dataSource.query(`
            SELECT p.publicId AS publicId, p.pseudo AS pseudo, p.slug AS slug, 1 AS isBot, r.rating AS rating
            FROM player p
            JOIN rating r ON r.id = p.currentRatingId
            WHERE p.isBot
            AND EXISTS (
                SELECT 1
                FROM game_to_player gp
                JOIN game g ON g.id = gp.gameId
                WHERE gp.playerId = p.id
                AND g.state = 'ended'
                AND g.endedAt >= ? AND g.endedAt < ?
            )
        `, [from, to]);
    }

    /**
     * Values used to compute "top X%" of all retrospectives of a year.
     * Some values are only in data json, extracted without loading whole data of every player.
     */
    async loadPercentileValues(year: number): Promise<PercentileValuesRow[]>
    {
        const rows: (Omit<PercentileValuesRow, 'accuracy' | 'movesPlayed' | 'liveThinkingSeconds' | 'hidden'> & {
            hidden: number;
            accuracy: null | number | string;
            movesPlayed: null | number | string;
            liveThinkingSeconds: null | number | string;
        })[] = await this.dataSource.query(`
            SELECT
                playerId, hidden, games1v1, livePlaySeconds, activeDays, chatMessages, rankedWins, endRating,
                JSON_EXTRACT(data, '$.accuracy') AS accuracy,
                JSON_EXTRACT(data, '$.movesPlayed') AS movesPlayed,
                JSON_EXTRACT(data, '$.liveThinkingSeconds') AS liveThinkingSeconds
            FROM player_retrospective
            WHERE year = ?
        `, [year]);

        const jsonNumber = (value: null | number | string): null | number => value === null || value === 'null' ? null : Number(value);

        return rows.map(row => ({
            ...row,
            hidden: !!row.hidden,
            endRating: row.endRating === null ? null : Number(row.endRating),
            accuracy: jsonNumber(row.accuracy),
            movesPlayed: jsonNumber(row.movesPlayed) ?? 0,
            liveThinkingSeconds: jsonNumber(row.liveThinkingSeconds) ?? 0,
        }));
    }

    /**
     * Data shared by all players of a year, loaded once.
     */
    async getYearContext(year: number): Promise<YearContext>
    {
        const existing = this.yearContexts.get(year);

        if (existing) {
            return existing;
        }

        const { from, to } = retrospectiveYearRange(year);

        const context: YearContext = {
            year,
            from,
            to,
            chatMessagesByPlayer: await this.loadChatMessagesCounts(from, to),
            tournamentsByPlayer: await this.loadTournaments(from, to),
            botRatings: await this.loadBotRatings(),
            ladders: await this.loadLadders(),
            ladderChallengesByPlayer: await this.loadLadderChallenges(from, to),
            ladderReignsByPlayer: await this.loadLadderReigns(from, to),
        };

        this.yearContexts.set(year, context);

        return context;
    }

    private async loadLadders(): Promise<Map<number, LadderRow>>
    {
        const rows: LadderRow[] = await this.dataSource.query('SELECT id, slug, name FROM ladder');

        return new Map(rows.map(row => [row.id, row]));
    }

    /**
     * Chat messages, game and channels, excluding moderated and "malkovich" ones.
     */
    private async loadChatMessagesCounts(from: Date, to: Date): Promise<Map<number, number>>
    {
        const rows: { playerId: number, total: string }[] = await this.dataSource.query(`
            SELECT playerId, SUM(total) AS total FROM (
                SELECT playerId, COUNT(*) AS total
                FROM chat_message
                WHERE createdAt >= ? AND createdAt < ?
                AND NOT deletedByModeration
                AND visibility != 'malkovich'
                AND playerId IS NOT NULL
                GROUP BY playerId
                UNION ALL
                SELECT playerId, COUNT(*) AS total
                FROM channel_chat_message
                WHERE createdAt >= ? AND createdAt < ?
                AND NOT deletedByModeration
                AND playerId IS NOT NULL
                GROUP BY playerId
            ) messages
            GROUP BY playerId
        `, [from, to, from, to]);

        return new Map(rows.map(({ playerId, total }) => [playerId, Number(total)]));
    }

    /**
     * Results in tournaments ended this year, not canceled nor hidden.
     */
    private async loadTournaments(from: Date, to: Date): Promise<Map<number, RetrospectiveTournament[]>>
    {
        const tournamentsByPlayer = new Map<number, RetrospectiveTournament[]>();
        const rows: { playerId: number, rank: number, publicId: string, slug: string, title: string, endedAt: Date, participantsCount: string }[] = await this.dataSource.query(`
            SELECT
                tp.playerId AS playerId,
                tp.\`rank\` AS \`rank\`,
                t.publicId AS publicId,
                t.slug AS slug,
                t.title AS title,
                t.endedAt AS endedAt,
                (SELECT COUNT(*) FROM tournament_participant tp2 WHERE tp2.tournamentId = t.id) AS participantsCount
            FROM tournament_participant tp
            JOIN tournament t ON t.id = tp.tournamentId
            WHERE t.endedAt >= ? AND t.endedAt < ?
            AND t.canceledAt IS NULL
            AND t.hidden = 0
            AND tp.\`rank\` IS NOT NULL
        `, [from, to]);

        for (const row of rows) {
            pushToMap(tournamentsByPlayer, row.playerId, {
                publicId: row.publicId,
                slug: row.slug,
                title: row.title,
                endedAt: new Date(row.endedAt).toISOString(),
                rank: row.rank,
                participantsCount: Number(row.participantsCount),
            });
        }

        return tournamentsByPlayer;
    }

    /**
     * Current overall rating of all bots, by bot id.
     */
    private async loadBotRatings(): Promise<Map<number, number>>
    {
        const rows: { id: number, rating: number }[] = await this.dataSource.query(`
            SELECT p.id AS id, r.rating AS rating
            FROM player p
            JOIN rating r ON r.id = p.currentRatingId
            WHERE p.isBot
        `);

        return new Map(rows.map(row => [row.id, row.rating]));
    }

    /**
     * Ladder challenges ended this year, not voided, indexed by challenger and defender.
     */
    private async loadLadderChallenges(from: Date, to: Date): Promise<Map<number, LadderChallengeRow[]>>
    {
        const challengesByPlayer = new Map<number, LadderChallengeRow[]>();
        const rows: LadderChallengeRow[] = await this.dataSource.query(`
            SELECT
                ladderId, endedAt, challengerId, defenderId, result,
                challengerPositionBefore, challengerPositionAfter,
                defenderPositionBefore, defenderPositionAfter
            FROM ladder_challenge
            WHERE endedAt >= ? AND endedAt < ?
            AND result IS NOT NULL
            AND result != 'voided'
        `, [from, to]);

        for (const row of rows) {
            pushToMap(challengesByPlayer, row.challengerId, row);
            pushToMap(challengesByPlayer, row.defenderId, row);
        }

        return challengesByPlayer;
    }

    /**
     * Ladder reigns overlapping this year, by king.
     */
    private async loadLadderReigns(from: Date, to: Date): Promise<Map<number, LadderReignRow[]>>
    {
        const reignsByPlayer = new Map<number, LadderReignRow[]>();
        const rows: LadderReignRow[] = await this.dataSource.query(`
            SELECT ladderId, playerId, startedAt, endedAt
            FROM ladder_reign
            WHERE startedAt < ?
            AND (endedAt IS NULL OR endedAt >= ?)
        `, [to, from]);

        for (const row of rows) {
            pushToMap(reignsByPlayer, row.playerId, row);
        }

        return reignsByPlayer;
    }
}
