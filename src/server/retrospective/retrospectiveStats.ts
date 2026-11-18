import type TimeControlType from '../../shared/time-control/TimeControlType.js';
import { timeControlToCadencyName } from '../../shared/app/timeControlUtils.js';
import {
    type GameImportance,
    type GameOfTheYearCandidate,
    ImportanceTier,
    SHOWN_GAME_MIN_MOVES,
    topPercent,
} from '../../shared/app/retrospective/retrospectiveRules.js';
import type {
    RetrospectiveGameContext,
    RetrospectiveLadder,
    RetrospectivePercentileKey,
    RetrospectivePlayerRef,
} from '../../shared/app/retrospective/retrospectiveTypes.js';
import type { GameRow, LadderChallengeRow, LadderReignRow, LadderRow, PercentileValuesRow } from './RetrospectiveDataLoader.js';

/*
 * Pure computations of retrospectives, from rows loaded by RetrospectiveDataLoader.
 */

export const splitSpaces = (value: null | string): string[] => value ? value.split(' ') : [];

const utcDay = (date: Date): string => date.toISOString().substring(0, 10);

const parseJson = <T>(value: string | T): T => typeof value === 'string' ? JSON.parse(value) as T : value;

export const isGameWon = (game: GameRow): boolean => game.winner === game.order;

/*
 * Games stats
 */

export type GamesStats = {
    games1v1: number;
    botGames: number;
    rankedWins: number;
    livePlaySeconds: number;
    liveThinkingSeconds: number;
    tournamentMatchesWon: number;
    tournamentMatchesPlayed: number;

    /**
     * Stones, swaps and passes played by player.
     */
    movesPlayed: number;

    distinctOpponents: number;

    /**
     * Days (UTC) where player played at least one move in this year.
     */
    activeDays: number;

    gamesByMonth: number[];

    /**
     * Ranked game won against registered opponent with best current confident rating.
     */
    strongestOpponentBeaten: null | { game: GameRow, rating: number };

    strongestBotBeatenRating: null | number;
};

/**
 * @param games Games of player ended in [from, to[
 * @param opponentCurrentRatings Current confident rating of opponents, by player id
 * @param botRatings Current rating of bots, by bot id
 */
export const computeGamesStats = (
    games: GameRow[],
    from: Date,
    to: Date,
    opponentCurrentRatings: Map<number, number>,
    botRatings: Map<number, number>,
): GamesStats => {
    let games1v1 = 0;
    let botGames = 0;
    let rankedWins = 0;
    let livePlaySeconds = 0;
    let liveThinkingSeconds = 0;
    let tournamentMatchesWon = 0;
    let tournamentMatchesPlayed = 0;
    let movesPlayed = 0;
    const distinctOpponents = new Set<number>();
    const activeDays = new Set<string>();
    const gamesByMonth: number[] = Array(12).fill(0);
    let strongestOpponentBeaten: null | { game: GameRow, rating: number } = null;
    let strongestBotBeatenRating: null | number = null;

    for (const game of games) {
        const won = isGameWon(game);
        const timestamps = splitSpaces(game.moveTimestamps).map(s => new Date(s));
        const allMoves = splitSpaces(game.moves);

        ++gamesByMonth[new Date(game.endedAt).getUTCMonth()];

        movesPlayed += Math.max(0, Math.ceil((allMoves.length - game.order) / 2));

        if (game.opponentType === 'player') {
            ++games1v1;

            if (game.opponentId !== null) {
                distinctOpponents.add(game.opponentId);
            }
        } else {
            ++botGames;
        }

        if (game.tournamentPublicId !== null && game.outcome !== 'forfeit') {
            ++tournamentMatchesPlayed;

            if (won) {
                ++tournamentMatchesWon;
            }
        }

        if (won && game.ranked && game.opponentType === 'player') {
            ++rankedWins;

            const opponentRating = game.opponentId !== null
                ? opponentCurrentRatings.get(game.opponentId) ?? null
                : null
            ;

            if (
                opponentRating !== null
                && allMoves.length >= SHOWN_GAME_MIN_MOVES
                && (strongestOpponentBeaten === null || opponentRating > strongestOpponentBeaten.rating)
            ) {
                strongestOpponentBeaten = { game, rating: opponentRating };
            }
        }

        if (won && game.opponentType === 'ai' && game.opponentId !== null) {
            const botRating = botRatings.get(game.opponentId);

            if (undefined !== botRating && (strongestBotBeatenRating === null || botRating > strongestBotBeatenRating)) {
                strongestBotBeatenRating = botRating;
            }
        }

        // Days where player played a move
        for (let i = game.order; i < timestamps.length; i += 2) {
            if (timestamps[i] >= from && timestamps[i] < to) {
                activeDays.add(utcDay(timestamps[i]));
            }
        }

        const timeControlType = parseJson<TimeControlType>(game.timeControlType);

        if (game.startedAt === null || timeControlToCadencyName({ timeControlType, boardsize: game.boardsize }) === 'correspondence') {
            continue;
        }

        livePlaySeconds += Math.max(0, (new Date(game.endedAt).getTime() - new Date(game.startedAt).getTime()) / 1000);

        for (let i = game.order; i < timestamps.length; i += 2) {
            const previous = i === 0 ? new Date(game.startedAt) : timestamps[i - 1];

            liveThinkingSeconds += Math.max(0, (timestamps[i].getTime() - previous.getTime()) / 1000);
        }
    }

    return {
        games1v1,
        botGames,
        rankedWins,
        livePlaySeconds: Math.round(livePlaySeconds),
        liveThinkingSeconds: Math.round(liveThinkingSeconds),
        tournamentMatchesWon,
        tournamentMatchesPlayed,
        movesPlayed,
        distinctOpponents: distinctOpponents.size,
        activeDays: activeDays.size,
        gamesByMonth,
        strongestOpponentBeaten,
        strongestBotBeatenRating,
    };
};

/*
 * Games shown in retrospective
 */

export const opponentRef = (game: GameRow): RetrospectivePlayerRef => ({
    publicId: game.opponentPublicId ?? '',
    pseudo: game.opponentPseudo ?? '',
    slug: game.opponentSlug ?? '',
    isBot: !!game.opponentIsBot,
});

export const gameContext = (game: GameRow): RetrospectiveGameContext => {
    if (game.tournamentPublicId !== null) {
        return {
            kind: 'tournament',
            tournamentTitle: game.tournamentTitle ?? undefined,
            tournamentRound: game.tournamentRound ?? undefined,
            tournamentMatchNumber: game.tournamentMatchNumber ?? undefined,
            tournamentMatchLabel: game.tournamentMatchLabel,
        };
    }

    if (game.ladderId !== null) {
        return {
            kind: 'ladder',
            ladderPlace: game.defenderPositionBefore ?? undefined,
        };
    }

    return { kind: 'opponent' };
};

/**
 * @param opponentRatings Opponent rating before game, by game id
 * @param botRatings Current rating of bots, by bot id
 */
export const gameImportance = (game: GameRow, opponentRatings: Map<number, number>, botRatings: Map<number, number>): GameImportance => ({
    tier: game.tournamentPublicId !== null
        ? ImportanceTier.TOURNAMENT
        : game.ladderId !== null
            ? ImportanceTier.LADDER
            : game.opponentType === 'ai'
                ? ImportanceTier.BOT
                : game.opponentIsGuest
                    ? ImportanceTier.GUEST_OPPONENT
                    : ImportanceTier.REGISTERED_OPPONENT,
    opponentRating: opponentRatings.get(game.id)
        ?? (game.opponentId !== null ? botRatings.get(game.opponentId) : undefined)
        ?? null,
});

/**
 * Games that can be shown on a board as game of the year: no forfeit, nor too short games.
 *
 * @param opponentRatings Opponent rating before game, by game id
 */
export const gameOfTheYearCandidates = (games: GameRow[], opponentRatings: Map<number, number>): GameOfTheYearCandidate<GameRow>[] => games
    .filter(game => game.outcome !== 'forfeit' && splitSpaces(game.moves).length >= SHOWN_GAME_MIN_MOVES)
    .map(game => ({
        game,
        endedAt: new Date(game.endedAt),
        opponentType: game.opponentType,
        opponentIsGuest: !!game.opponentIsGuest,
        opponentRating: opponentRatings.get(game.id) ?? null,
        won: isGameWon(game),
        tournament: game.tournamentPublicId !== null ? { publicId: game.tournamentPublicId, round: game.tournamentRound ?? 0 } : null,
        ladder: game.ladderId !== null ? { defenderPositionBefore: game.defenderPositionBefore } : null,
    }))
;

/*
 * King of the Hill
 */

/**
 * King of the Hill stats of a player, for each ladder player played in or reigned on during the year.
 *
 * @param challenges Challenges of player ended in [from, to[, not voided
 * @param reigns Reigns of player overlapping [from, to[
 * @param now Reigns not ended yet are counted until now, if year is not over
 */
export const computeLadders = (
    playerId: number,
    ladders: Map<number, LadderRow>,
    challenges: LadderChallengeRow[],
    reigns: LadderReignRow[],
    from: Date,
    to: Date,
    now: Date = new Date(),
): RetrospectiveLadder[] => {
    const ladderIds = new Set<number>([
        ...challenges.map(c => c.ladderId),
        ...reigns.map(r => r.ladderId),
    ]);

    const result: RetrospectiveLadder[] = [];
    const yearEnd = Math.min(to.getTime(), now.getTime());

    for (const ladderId of ladderIds) {
        const ladder = ladders.get(ladderId);

        if (!ladder) {
            continue;
        }

        // Positions reached, and when
        const positions: { position: number, at: number }[] = [];
        let defenses = 0;
        let challengesWon = 0;
        let winStreak = 0;
        let bestWinStreak = 0;
        const ladderChallenges = challenges
            .filter(c => c.ladderId === ladderId)
            .sort((a, b) => new Date(a.endedAt).getTime() - new Date(b.endedAt).getTime())
        ;

        for (const c of ladderChallenges) {
            const isChallenger = c.challengerId === playerId;
            const won = c.result === (isChallenger ? 'challenger_won' : 'defender_won');

            if (won) {
                ++challengesWon;
                bestWinStreak = Math.max(bestWinStreak, ++winStreak);
            } else {
                winStreak = 0;
            }

            const before = isChallenger ? c.challengerPositionBefore : c.defenderPositionBefore;
            const after = isChallenger ? c.challengerPositionAfter : c.defenderPositionAfter;
            const at = new Date(c.endedAt).getTime();

            if (before !== null) {
                positions.push({ position: before, at });
            }

            if (after !== null) {
                positions.push({ position: after, at });
            }

            if (!isChallenger && c.defenderPositionBefore === 1 && c.result === 'defender_won') {
                ++defenses;
            }
        }

        let kingMs = 0;
        let kingAtYearEnd = false;

        for (const reign of reigns.filter(r => r.ladderId === ladderId)) {
            const start = Math.max(new Date(reign.startedAt).getTime(), from.getTime());
            const end = Math.min(reign.endedAt === null ? yearEnd : new Date(reign.endedAt).getTime(), yearEnd);

            if (end > start) {
                kingMs += end - start;
                positions.push({ position: 1, at: start });

                if (end === yearEnd) {
                    kingAtYearEnd = true;
                }
            }
        }

        // Best position, first time reached
        const best = positions.sort((a, b) => (a.position - b.position) || (a.at - b.at))[0] ?? null;

        result.push({
            slug: ladder.slug,
            name: ladder.name,
            challengesCount: ladderChallenges.length,
            challengesWon,
            bestWinStreak,
            bestPosition: best?.position ?? null,
            bestPositionAt: best === null ? null : new Date(best.at).toISOString(),
            defenses,
            kingSeconds: Math.round(kingMs / 1000),
            kingAtYearEnd,
        });
    }

    return result;
};

/*
 * Top percents
 */

/**
 * Value compared for each "top X%", null if player has no value (not counted in population).
 */
const percentileValueGetters: Record<RetrospectivePercentileKey, (row: PercentileValuesRow) => null | number> = {
    games1v1: row => row.games1v1 > 0 ? row.games1v1 : null,
    livePlaySeconds: row => row.livePlaySeconds > 0 ? row.livePlaySeconds : null,
    activeDays: row => row.activeDays > 0 ? row.activeDays : null,
    chatMessages: row => row.chatMessages > 0 ? row.chatMessages : null,
    rankedWins: row => row.rankedWins > 0 ? row.rankedWins : null,
    rating: row => row.endRating,
    accuracy: row => row.accuracy,
    movesPlayed: row => row.movesPlayed > 0 ? row.movesPlayed : null,
    liveThinkingSeconds: row => row.liveThinkingSeconds > 0 ? row.liveThinkingSeconds : null,
};

const percentileKeys = Object.keys(percentileValueGetters) as RetrospectivePercentileKey[];

/**
 * Number of values strictly greater than value, in an ascending sorted array.
 */
export const countGreater = (sorted: number[], value: number): number => {
    let low = 0;
    let high = sorted.length;

    while (low < high) {
        const mid = (low + high) >>> 1;

        if (sorted[mid] <= value) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }

    return sorted.length - low;
};

/**
 * Sorted values of each "top X%" key, among visible retrospectives of the year.
 */
export type PercentilePopulation = Record<RetrospectivePercentileKey, number[]>;

export const buildPercentilePopulation = (rows: PercentileValuesRow[]): PercentilePopulation => {
    const population = {} as PercentilePopulation;
    const visibleRows = rows.filter(row => !row.hidden);

    for (const key of percentileKeys) {
        population[key] = visibleRows
            .map(percentileValueGetters[key])
            .filter((value): value is number => value !== null)
            .sort((a, b) => a - b)
        ;
    }

    return population;
};

/**
 * "Top X%" of a retrospective among population.
 * A hidden retrospective is not in population, it is compared as if it was added to it.
 */
export const computeTopPercents = (row: PercentileValuesRow, population: PercentilePopulation): Partial<Record<RetrospectivePercentileKey, number>> => {
    const topPercents: Partial<Record<RetrospectivePercentileKey, number>> = {};

    for (const key of percentileKeys) {
        const value = percentileValueGetters[key](row);

        if (value === null) {
            continue;
        }

        const sorted = population[key];

        topPercents[key] = topPercent(countGreater(sorted, value), sorted.length + (row.hidden ? 1 : 0));
    }

    return topPercents;
};
