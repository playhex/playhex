import fs from 'node:fs';
import { AppDataSource } from '../data-source.js';
import hexProgram from './hexProgram.js';
import { Player, PlayerSettings } from '../../shared/app/models/index.js';
import type TimeControlType from '../../shared/time-control/TimeControlType.js';

/**
 * A game is considered "live" when initial time is below this threshold, else "correspondence".
 * Kept at 8h (instead of the stricter 4h/24h boundary enforced on new games)
 * because legacy games may have an initial time that falls in between.
 */
const LIVE_MAX_INITIAL_TIME_MS = 8 * 3600 * 1000;

/**
 * Players with a rating deviation above this are excluded from the rating distribution stat:
 * their rating is not settled enough yet to be representative.
 */
const RATING_MAX_DEVIATION = 250;

/**
 * Games with less moves than this are excluded from all stats:
 * too short to be representative (aborted-ish games, connection tests, etc).
 */
const MIN_MOVES_COUNT = 4;

type CategoryStats = {
    count: number;
    liveCount: number;
    correspondenceCount: number;
    meetsCount?: number;
    rankedCount: number;
    boardsizeCounts: Record<number, number>;
    movesCountByBoardsize: Record<number, { avg: number, median: number }>;
    redWinCount: number;
    blueWinCount: number;

    /**
     * How ended games were won: 'path' (connection), 'resign', 'time' (timeout), 'forfeit'.
     * Games with no outcome (shouldn't happen for ended games) are not counted.
     */
    outcomeCounts: Record<string, number>;

    /**
     * Number of games where the swap rule was enabled.
     */
    swapRuleEnabledCount: number;

    /**
     * Number of games with the swap rule enabled where the 2nd move was "swap-pieces".
     */
    swapCount: number;

    totalStonesPlaced: number;
    stonesPlacedByHuman: number;
    stonesPlacedByBot?: number;

    /**
     * Stones placed by day of week / hour of day, in UTC.
     * heatmap[dayOfWeek][hour], dayOfWeek: 0 = Sunday ... 6 = Saturday (JS Date#getUTCDay convention).
     */
    activityHeatmap: number[][];

    /**
     * First move played, counted per boardsize (opening move notation only makes sense
     * relative to a given boardsize).
     */
    openingMoveCountsByBoardsize: Record<number, Record<string, number>>;
};

type PeriodStats = {
    generatedAt: string;

    /**
     * 1v1 (player vs player) games only.
     */
    pvpOnly: CategoryStats;

    /**
     * All games, 1v1 and bot games combined.
     */
    allGames: CategoryStats;
};

const median = (values: number[]): number => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid]
    ;
};

const createEmptyCategoryStats = (withMeets: boolean): CategoryStats => ({
    count: 0,
    liveCount: 0,
    correspondenceCount: 0,
    meetsCount: withMeets ? 0 : undefined,
    rankedCount: 0,
    boardsizeCounts: {},
    movesCountByBoardsize: {},
    redWinCount: 0,
    blueWinCount: 0,
    outcomeCounts: {},
    swapRuleEnabledCount: 0,
    swapCount: 0,
    totalStonesPlaced: 0,
    stonesPlacedByHuman: 0,
    stonesPlacedByBot: withMeets ? undefined : 0,
    activityHeatmap: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0)),
    openingMoveCountsByBoardsize: {},
});

type GameRow = {
    boardsize: number;
    opponentType: 'player' | 'ai';
    timeControlType: string | TimeControlType;
    winner: null | 0 | 1;
    moves: string;
    moveTimestamps: string;
    ranked: 0 | 1;
    outcome: null | string;
    swapRule: 0 | 1;
    player0Id: number;
    player0IsBot: 0 | 1;
    player1Id: number;
    player1IsBot: 0 | 1;
};

/**
 * One row per ended game, joining both players (order 0 = red, order 1 = blue) in the same row.
 * Raw SQL + manual iteration is used here (instead of the TypeORM entity repository) because
 * "overall" can cover several hundred thousand games, and hydrating full entities with relations
 * for that many rows exhausts the default heap.
 */
const fetchGameRows = (from: null | Date, to: Date): Promise<GameRow[]> => {
    return AppDataSource.query(`
        SELECT
            hg.boardsize AS boardsize,
            hg.opponentType AS opponentType,
            hg.timeControlType AS timeControlType,
            hg.winner AS winner,
            hg.moves AS moves,
            hg.moveTimestamps AS moveTimestamps,
            hg.ranked AS ranked,
            hg.outcome AS outcome,
            hg.swapRule AS swapRule,
            p0.id AS player0Id,
            p0.isBot AS player0IsBot,
            p1.id AS player1Id,
            p1.isBot AS player1IsBot
        FROM hosted_game hg
        JOIN hosted_game_to_player hgp0 ON hgp0.hostedGameId = hg.id AND hgp0.\`order\` = 0
        JOIN player p0 ON p0.id = hgp0.playerId
        JOIN hosted_game_to_player hgp1 ON hgp1.hostedGameId = hg.id AND hgp1.\`order\` = 1
        JOIN player p1 ON p1.id = hgp1.playerId
        WHERE hg.state = 'ended'
        ${from ? 'AND hg.endedAt >= ?' : ''}
        AND hg.endedAt < ?
    `, from ? [from, to] : [to]);
};

const applyGameToStats = (
    categoryStats: CategoryStats,
    movesCounts: Record<number, number[]>,
    meets: null | Set<string>,
    game: GameRow,
    moves: string[],
    initialTime: number,
): void => {
    categoryStats.count++;

    categoryStats.boardsizeCounts[game.boardsize] = (categoryStats.boardsizeCounts[game.boardsize] ?? 0) + 1;

    (movesCounts[game.boardsize] ??= []).push(moves.length);

    if (initialTime <= LIVE_MAX_INITIAL_TIME_MS) {
        categoryStats.liveCount++;
    } else {
        categoryStats.correspondenceCount++;
    }

    if (game.ranked) {
        categoryStats.rankedCount++;
    }

    if (game.winner === 0) {
        categoryStats.redWinCount++;
    } else if (game.winner === 1) {
        categoryStats.blueWinCount++;
    }

    if (game.outcome) {
        categoryStats.outcomeCounts[game.outcome] = (categoryStats.outcomeCounts[game.outcome] ?? 0) + 1;
    }

    if (game.swapRule) {
        categoryStats.swapRuleEnabledCount++;

        if (moves[1] === 'swap-pieces') {
            categoryStats.swapCount++;
        }
    }

    if (moves.length > 0 && moves[0] !== 'pass') {
        const openingMoveCounts = (categoryStats.openingMoveCountsByBoardsize[game.boardsize] ??= {});
        openingMoveCounts[moves[0]] = (openingMoveCounts[moves[0]] ?? 0) + 1;
    }

    if (meets) {
        const pairKey = [game.player0Id, game.player1Id].sort((a, b) => a - b).join('-');
        meets.add(pairKey);
    }

    const timestamps = game.moveTimestamps.length > 0 ? game.moveTimestamps.split(' ') : [];

    moves.forEach((move, i) => {
        if (move === 'pass') {
            return;
        }

        categoryStats.totalStonesPlaced++;

        const moverIsBot = i % 2 === 0 ? game.player0IsBot : game.player1IsBot;

        if (moverIsBot) {
            categoryStats.stonesPlacedByBot = (categoryStats.stonesPlacedByBot ?? 0) + 1;
        } else {
            categoryStats.stonesPlacedByHuman++;
        }

        if (i < timestamps.length) {
            const playedAt = new Date(timestamps[i]);
            categoryStats.activityHeatmap[playedAt.getUTCDay()][playedAt.getUTCHours()]++;
        }
    });
};

const computePeriodStats = async (from: null | Date, to: Date): Promise<PeriodStats> => {
    const games = await fetchGameRows(from, to);

    const movesCountsPvp: Record<number, number[]> = {};
    const movesCountsAll: Record<number, number[]> = {};
    const meets = new Set<string>();

    const pvpOnly = createEmptyCategoryStats(true);
    const allGames = createEmptyCategoryStats(false);

    for (const game of games) {
        const moves = game.moves.length > 0 ? game.moves.split(' ') : [];

        // Exclude too short / irrelevant games from all stats
        if (moves.length < MIN_MOVES_COUNT) {
            continue;
        }

        const timeControlType: TimeControlType = typeof game.timeControlType === 'string'
            ? JSON.parse(game.timeControlType)
            : game.timeControlType
        ;
        const initialTime = timeControlType.options.initialTime;

        applyGameToStats(allGames, movesCountsAll, null, game, moves, initialTime);

        if (game.opponentType === 'player') {
            applyGameToStats(pvpOnly, movesCountsPvp, meets, game, moves, initialTime);
        }
    }

    pvpOnly.meetsCount = meets.size;

    for (const [boardsize, movesCounts] of Object.entries(movesCountsPvp)) {
        pvpOnly.movesCountByBoardsize[+boardsize] = {
            avg: movesCounts.reduce((sum, n) => sum + n, 0) / movesCounts.length,
            median: median(movesCounts),
        };
    }

    for (const [boardsize, movesCounts] of Object.entries(movesCountsAll)) {
        allGames.movesCountByBoardsize[+boardsize] = {
            avg: movesCounts.reduce((sum, n) => sum + n, 0) / movesCounts.length,
            median: median(movesCounts),
        };
    }

    return {
        generatedAt: new Date().toISOString(),
        pvpOnly,
        allGames,
    };
};

type CommonStats = {
    generatedAt: string;
    playerFlagCounts: Record<string, number>;
    boardOrientationCounts: { flat: number, diamond: number };
    shadingPatternCounts: Record<string, number>;

    /**
     * Overall Glicko-2 rating distribution, bucketed by 100 (key = bucket floor, e.g "1400" = [1400, 1500[).
     * Only players with a reasonably settled rating (deviation < RATING_MAX_DEVIATION) are counted,
     * so new/inactive players with a wide-open rating don't skew the distribution.
     */
    ratingDistribution: Record<number, number>;
};

/**
 * Landscape/portrait orientation values are picked among 3 choices each (see PageSettings.vue),
 * each mapped to either "flat" or "diamond" board shape. "flat_2" is merged into "flat" here,
 * since only the flat/diamond distinction matters for this stat.
 */
const ORIENTATION_SHAPE_BY_VALUE: { landscape: Record<number, 'flat' | 'diamond'>, portrait: Record<number, 'flat' | 'diamond'> } = {
    landscape: { 0: 'flat', 10: 'flat', 11: 'diamond' },
    portrait: { 1: 'flat', 9: 'flat', 2: 'diamond' },
};

const computeCommonStats = async (): Promise<CommonStats> => {
    // Grouping by countryFlag in SQL is unreliable: default collations can consider
    // visually/codepoint-close flag emojis as equal. Count in JS instead (exact string equality).
    const flagValues: { countryFlag: string }[] = await AppDataSource.getRepository(Player)
        .createQueryBuilder('player')
        .select('player.countryFlag', 'countryFlag')
        .where('player.isBot = false')
        .andWhere('player.countryFlag IS NOT NULL')
        .getRawMany();

    const playerFlagCounts: Record<string, number> = {};

    for (const { countryFlag } of flagValues) {
        playerFlagCounts[countryFlag] = (playerFlagCounts[countryFlag] ?? 0) + 1;
    }

    const orientationValues: { orientationLandscape: number, orientationPortrait: number }[] = await AppDataSource.getRepository(PlayerSettings)
        .createQueryBuilder('playerSettings')
        .select('playerSettings.orientationLandscape', 'orientationLandscape')
        .addSelect('playerSettings.orientationPortrait', 'orientationPortrait')
        .getRawMany();

    const boardOrientationCounts = { flat: 0, diamond: 0 };

    for (const { orientationLandscape, orientationPortrait } of orientationValues) {
        const landscapeShape = ORIENTATION_SHAPE_BY_VALUE.landscape[orientationLandscape];
        const portraitShape = ORIENTATION_SHAPE_BY_VALUE.portrait[orientationPortrait];

        if (landscapeShape) {
            boardOrientationCounts[landscapeShape]++;
        }

        if (portraitShape) {
            boardOrientationCounts[portraitShape]++;
        }
    }

    const shadingPatternValues: { boardShadingPattern: string }[] = await AppDataSource.getRepository(PlayerSettings)
        .createQueryBuilder('playerSettings')
        .select('playerSettings.boardShadingPattern', 'boardShadingPattern')
        .where('playerSettings.boardShadingPattern IS NOT NULL')
        .getRawMany();

    const shadingPatternCounts: Record<string, number> = {};

    for (const { boardShadingPattern } of shadingPatternValues) {
        shadingPatternCounts[boardShadingPattern] = (shadingPatternCounts[boardShadingPattern] ?? 0) + 1;
    }

    const ratingRows: { rating: number }[] = await AppDataSource.query(`
        SELECT r.rating AS rating
        FROM player p
        JOIN rating r ON r.id = p.currentRatingId
        WHERE r.deviation < ?
        AND NOT p.isBot
    `, [RATING_MAX_DEVIATION]);

    const ratingDistribution: Record<number, number> = {};

    for (const { rating } of ratingRows) {
        const bucket = Math.floor(rating / 100) * 100;
        ratingDistribution[bucket] = (ratingDistribution[bucket] ?? 0) + 1;
    }

    return {
        generatedAt: new Date().toISOString(),
        playerFlagCounts,
        boardOrientationCounts,
        shadingPatternCounts,
        ratingDistribution,
    };
};

hexProgram
    .command('generate-stats')
    .description('Compute PlayHex statistics and write them as json files to be displayed on the statistics page')
    .action(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const now = new Date();
        const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

        const periods: { name: string, from: null | Date }[] = [
            { name: 'last-7-days', from: new Date(todayStart.getTime() - 7 * 86400000) },
            { name: 'last-28-days', from: new Date(todayStart.getTime() - 28 * 86400000) },
            { name: 'last-365-days', from: new Date(todayStart.getTime() - 365 * 86400000) },
            { name: 'overall', from: null },
        ];

        const serverPath = 'assets/stats';

        if (!fs.existsSync(serverPath)) {
            fs.mkdirSync(serverPath, { recursive: true });
        }

        for (const period of periods) {
            console.log(`Computing stats for period "${period.name}"...`);

            const periodStats = await computePeriodStats(period.from, todayStart);

            fs.writeFileSync(`${serverPath}/${period.name}.json`, JSON.stringify(periodStats), 'utf-8');
        }

        console.log('Computing common stats...');

        const commonStats = await computeCommonStats();

        fs.writeFileSync(`${serverPath}/common.json`, JSON.stringify(commonStats), 'utf-8');

        console.log('done.');
    })
;
