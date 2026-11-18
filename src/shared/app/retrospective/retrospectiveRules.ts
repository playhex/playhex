import type { GameAnalyzeData } from '../models/GameAnalyze.js';
import type { RetrospectiveChallenge, RetrospectivePlayerRef, RetrospectiveTournament, RetrospectiveTrend } from './retrospectiveTypes.js';

/**
 * Lobby card is shown from January 1st, until this month (excluded), 0-indexed (4 = May).
 */
const LOBBY_CARD_END_MONTH = 4;

/**
 * A move is a blunder when player loses more than this win rate in one move.
 */
export const BLUNDER_MIN_WIN_RATE_LOSS = 0.7;

/**
 * Accuracy is only shown when computed on at least this number of analyzed games.
 */
export const ACCURACY_MIN_ANALYZED_GAMES = 3;

/**
 * Game of the year and strongest opponent beaten games are shown on a board:
 * games with less moves than this are not considered (too short to be interesting, early resign).
 */
export const SHOWN_GAME_MIN_MOVES = 8;

/**
 * Max number of challenges shown at the end of a retrospective.
 */
const MAX_CHALLENGES = 3;

const yearStart = (year: number): Date => new Date(Date.UTC(year, 0, 1));

/**
 * Date range [from, to[ of a retrospective year, in UTC.
 */
export const retrospectiveYearRange = (year: number): { from: Date, to: Date } => ({
    from: yearStart(year),
    to: yearStart(year + 1),
});

/**
 * Feature launch: before this date, retrospectives are not listed anywhere (profile, menu, lobby),
 * only reachable by their link.
 *
 * TODO remove after 2026 is ended
 */
export const RETROSPECTIVES_LISTED_FROM = new Date(Date.UTC(2027, 0, 1));

export const areRetrospectivesListed = (now: Date = new Date()): boolean =>
    now.getTime() >= RETROSPECTIVES_LISTED_FROM.getTime()
;

/**
 * Whether the year is over, so its retrospective can be displayed (if generated).
 */
export const isRetrospectiveYearOver = (year: number, now: Date = new Date()): boolean =>
    now.getTime() >= yearStart(year + 1).getTime()
;

/**
 * Whether player was there for the whole year: no retrospective for the year of arrival,
 * an incomplete year would look poor.
 */
export const isRetrospectiveYearComplete = (playerCreatedAt: Date, year: number): boolean =>
    playerCreatedAt.getTime() < yearStart(year).getTime()
;

/**
 * Whether a player gets a visible retrospective for this year:
 * registered human player, there for the whole year, who ended at least one game this year.
 * Excludes "anonymous" accounts holding games of deleted players.
 * Other retrospectives are computed hidden (i.e previous year snapshot to show progress), never displayed.
 */
export const isRetrospectiveEligible = (
    player: { isBot: boolean, slug: string, createdAt: Date, registeredAt: null | Date },
    year: number,
    gamesCount: number,
): boolean =>
    !player.isBot
    && !player.slug.startsWith('anonymous')
    && player.registeredAt !== null
    && player.registeredAt.getTime() < yearStart(year + 1).getTime()
    && isRetrospectiveYearComplete(player.createdAt, year)
    && gamesCount > 0
;

export const RETROSPECTIVE_SHARE_CODE_LENGTH = 5;

const SHARE_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Random code in retrospective url, e.g "aZ3kQ".
 *
 * @param randomInt Returns a random integer in [0, max), cryptographically secure on server.
 */
export const generateRetrospectiveShareCode = (randomInt: (max: number) => number): string =>
    Array.from({ length: RETROSPECTIVE_SHARE_CODE_LENGTH }, () => SHARE_CODE_ALPHABET[randomInt(SHARE_CODE_ALPHABET.length)]).join('')
;

export const isValidRetrospectiveShareCode = (code: string): boolean =>
    new RegExp(`^[A-Za-z0-9]{${RETROSPECTIVE_SHARE_CODE_LENGTH}}$`).test(code)
;

/**
 * Year of the retrospective promoted on lobby at a given date: previous year.
 */
export const lobbyRetrospectiveYear = (now: Date = new Date()): number => now.getUTCFullYear() - 1;

/**
 * Whether the lobby card promoting last year retrospective should be shown.
 *
 * @param dismissedAt Last time player dismissed a retrospective card, any year.
 *                    If before this year, it was the dismiss of a previous retrospective.
 * @param lastYearRetrospectiveExists Whether last year retrospective has been generated for this player.
 */
export const shouldShowLobbyCard = (now: Date, dismissedAt: null | undefined | Date, lastYearRetrospectiveExists: boolean): boolean => {
    if (!lastYearRetrospectiveExists) {
        return false;
    }

    const currentYear = now.getUTCFullYear();

    if (now.getTime() >= Date.UTC(currentYear, LOBBY_CARD_END_MONTH, 1)) {
        return false;
    }

    if (dismissedAt && new Date(dismissedAt).getTime() >= yearStart(currentYear).getTime()) {
        return false;
    }

    return true;
};

/**
 * "Top X%", given how many players have a strictly better value, out of total players.
 * Rounded down, so that best players are not penalized in small populations,
 * but never "top 0%": always between 1 and 100.
 */
export const topPercent = (betterCount: number, total: number): number => {
    if (total <= 0) {
        return 100;
    }

    return Math.min(100, Math.max(1, Math.floor(100 * (betterCount + 1) / total)));
};

/**
 * Number of full years between two dates.
 */
export const fullYearsBetween = (from: Date, to: Date): number => {
    let years = to.getUTCFullYear() - from.getUTCFullYear();

    if (
        to.getUTCMonth() < from.getUTCMonth()
        || (to.getUTCMonth() === from.getUTCMonth() && to.getUTCDate() < from.getUTCDate())
    ) {
        --years;
    }

    return Math.max(0, years);
};

export const compareTrend = (current: number, previous: number, higherIsBetter = true): RetrospectiveTrend => {
    if (current === previous) {
        return 'same';
    }

    return (current > previous) === higherIsBetter ? 'up' : 'down';
};

/*
 * Analyzes
 */

export type AnalyzedPlayerMove = {
    moveIndex: number;
    move: string;
    bestMove: null | string;

    /**
     * Player win rate with best move, between 0 and 1.
     */
    winRateBefore: number;

    /**
     * Player win rate after played move, between 0 and 1.
     */
    winRateAfter: number;
};

/**
 * Moves played by a player in an analyzed game, with win rates from player point of view.
 * Deep analyze (mcts) is preferred when available.
 * Moves with unknown win rates are skipped.
 *
 * @param playerOrder 0 if player played first (even move indexes), else 1.
 */
export const analyzedPlayerMoves = (analyze: GameAnalyzeData, playerOrder: number): AnalyzedPlayerMove[] => {
    const moves: AnalyzedPlayerMove[] = [];

    for (const moveAnalyze of analyze) {
        if (!moveAnalyze || moveAnalyze.moveIndex % 2 !== playerOrder) {
            continue;
        }

        const { move, bestMoves, whiteWin } = moveAnalyze.mcts ?? moveAnalyze;

        if (!move) {
            continue;
        }

        const afterWhiteWin = move.whiteWin
            ?? bestMoves.find(bestMove => bestMove.move === move.move)?.whiteWin
        ;
        const beforeWhiteWin = bestMoves[0]?.whiteWin ?? whiteWin;

        if (typeof afterWhiteWin !== 'number' || typeof beforeWhiteWin !== 'number') {
            continue;
        }

        const toPlayer = (value: number) => moveAnalyze.color === 'white' ? value : 1 - value;

        moves.push({
            moveIndex: moveAnalyze.moveIndex,
            move: move.move,
            bestMove: bestMoves[0]?.move ?? null,
            winRateBefore: toPlayer(beforeWhiteWin),
            winRateAfter: toPlayer(afterWhiteWin),
        });
    }

    return moves;
};

export const isBlunder = (move: AnalyzedPlayerMove): boolean =>
    move.winRateBefore - move.winRateAfter > BLUNDER_MIN_WIN_RATE_LOSS
;

/**
 * Win rate kept by player on each move, between 0 and 1: 1 means always played as well as the engine.
 * Null if no move.
 */
export const movesAccuracy = (moves: AnalyzedPlayerMove[]): null | { sum: number, count: number } => {
    if (moves.length === 0) {
        return null;
    }

    let sum = 0;

    for (const move of moves) {
        sum += 1 - Math.max(0, move.winRateBefore - move.winRateAfter);
    }

    return { sum, count: moves.length };
};

/*
 * Game importance, to pick game of the year and blunder game
 */

/**
 * Lower is more important.
 */
export const ImportanceTier = {
    TOURNAMENT: 0,
    LADDER: 1,
    REGISTERED_OPPONENT: 2,
    GUEST_OPPONENT: 3,
    BOT: 4,
} as const;

export type GameImportance = {
    tier: typeof ImportanceTier[keyof typeof ImportanceTier];

    /**
     * Opponent rating before game, if known. Higher is more important.
     */
    opponentRating: null | number;
};

const compareImportance = (a: GameImportance, b: GameImportance): number =>
    (a.tier - b.tier)
    || ((b.opponentRating ?? -Infinity) - (a.opponentRating ?? -Infinity))
;

/**
 * A game is shown as "blunder of the year" only if player made at most this number of blunders in it.
 */
export const BLUNDER_GAME_MAX_BLUNDERS = 3;

/**
 * Games shorter than this are not considered to show a blunder:
 * too short to be meaningful (early resign, aborted-ish games).
 */
export const BLUNDER_GAME_MIN_MOVES = 20;

/**
 * Player was very winning before the blunder, and very losing after it.
 */
const BLUNDER_VERY_WINNING = 0.8;
const BLUNDER_VERY_LOSING = 0.2;

/**
 * Player was very winning on this number of own moves just before the blunder, at least.
 */
const BLUNDER_WINNING_STREAK_MIN = 4;
const BLUNDER_WINNING_STREAK_WIN_RATE = 0.7;

/**
 * Player was winning on most of own moves of the game.
 */
const BLUNDER_WINNING_MOVES_MIN_RATIO = 0.5;

/**
 * After the blunder, player never got back above this win rate until the end of the game.
 */
const BLUNDER_NEVER_RECOVERED_MAX_WIN_RATE = 0.35;

/**
 * The blunder is in the last part of the game, after this ratio of played moves.
 */
const BLUNDER_LATE_MIN_RATIO = 0.5;

export type BlunderGameCandidate<T> = {
    game: T;

    /**
     * All analyzed moves of player in this game, ordered.
     */
    moves: AnalyzedPlayerMove[];
    movesCount: number;
    won: boolean;
    importance: GameImportance;
};

/**
 * The blunder that lost a game player was winning most of the time, if any:
 * very winning since a while, then very losing until the end of the game, with few blunders.
 */
export const gameLosingBlunder = <T>(candidate: BlunderGameCandidate<T>): null | { blunder: AnalyzedPlayerMove, winningStreak: number } => {
    const { moves, movesCount } = candidate;

    if (candidate.won || movesCount < BLUNDER_GAME_MIN_MOVES || moves.length === 0) {
        return null;
    }

    if (moves.filter(isBlunder).length > BLUNDER_GAME_MAX_BLUNDERS) {
        return null;
    }

    if (moves.filter(move => move.winRateBefore >= 0.5).length / moves.length < BLUNDER_WINNING_MOVES_MIN_RATIO) {
        return null;
    }

    for (let i = moves.length - 1; i >= 0; --i) {
        const blunder = moves[i];

        if (!isBlunder(blunder) || blunder.winRateBefore < BLUNDER_VERY_WINNING || blunder.winRateAfter > BLUNDER_VERY_LOSING) {
            continue;
        }

        if (blunder.moveIndex / movesCount < BLUNDER_LATE_MIN_RATIO) {
            return null;
        }

        if (moves.slice(i + 1).some(move => move.winRateBefore > BLUNDER_NEVER_RECOVERED_MAX_WIN_RATE)) {
            return null;
        }

        let winningStreak = 0;

        for (let j = i - 1; j >= 0 && moves[j].winRateBefore >= BLUNDER_WINNING_STREAK_WIN_RATE; --j) {
            ++winningStreak;
        }

        if (winningStreak < BLUNDER_WINNING_STREAK_MIN) {
            return null;
        }

        return { blunder, winningStreak };
    }

    return null;
};

/**
 * Pick the game to show the blunder of the year from, among games lost by a blunder (see gameLosingBlunder()):
 * most important games first (tournament, ladder, strong registered opponent),
 * then the longest time player was very winning before the blunder.
 */
export const pickBlunderGame = <T>(candidates: BlunderGameCandidate<T>[]): null | { candidate: BlunderGameCandidate<T>, blunder: AnalyzedPlayerMove } => {
    const matching = candidates
        .map(candidate => ({ candidate, losing: gameLosingBlunder(candidate) }))
        .filter((c): c is { candidate: BlunderGameCandidate<T>, losing: NonNullable<ReturnType<typeof gameLosingBlunder>> } => c.losing !== null)
    ;

    if (matching.length === 0) {
        return null;
    }

    matching.sort((a, b) =>
        compareImportance(a.candidate.importance, b.candidate.importance)
        || (b.losing.winningStreak - a.losing.winningStreak),
    );

    return { candidate: matching[0].candidate, blunder: matching[0].losing.blunder };
};

export type GameOfTheYearCandidate<T> = {
    game: T;
    endedAt: Date;
    opponentType: 'player' | 'ai';
    opponentIsGuest: boolean;
    opponentRating: null | number;
    won: boolean;
    tournament: null | { publicId: string, round: number };
    ladder: null | { defenderPositionBefore: null | number };
};

/**
 * Most important game won of the year:
 * - a tournament game, from best tournament if possible, at the most advanced round,
 * - else a ladder game, played at the best place in the ladder,
 * - else the game against the strongest registered opponent.
 *
 * @param excludedGame Game already shown elsewhere (strongest opponent beaten), never picked.
 */
export const pickGameOfTheYear = <T>(
    candidates: GameOfTheYearCandidate<T>[],
    bestTournamentPublicId: null | string,
    excludedGame: null | T = null,
): null | GameOfTheYearCandidate<T> => {
    // Only victories: a game to be proud of
    candidates = candidates.filter(c => c.won && (excludedGame === null || c.game !== excludedGame));

    const latestFirst = (a: GameOfTheYearCandidate<T>, b: GameOfTheYearCandidate<T>) => b.endedAt.getTime() - a.endedAt.getTime();

    const tournamentGames = candidates.filter(c => c.tournament !== null);

    if (tournamentGames.length > 0) {
        return tournamentGames.sort((a, b) =>
            (Number(b.tournament!.publicId === bestTournamentPublicId) - Number(a.tournament!.publicId === bestTournamentPublicId))
            || (b.tournament!.round - a.tournament!.round)
            || latestFirst(a, b),
        )[0];
    }

    const ladderGames = candidates.filter(c => c.ladder !== null);

    if (ladderGames.length > 0) {
        return ladderGames.sort((a, b) =>
            ((a.ladder!.defenderPositionBefore ?? Infinity) - (b.ladder!.defenderPositionBefore ?? Infinity))
            || latestFirst(a, b),
        )[0];
    }

    const registeredOpponentGames = candidates.filter(c => c.opponentType === 'player' && !c.opponentIsGuest);

    if (registeredOpponentGames.length > 0) {
        return registeredOpponentGames.sort((a, b) =>
            ((b.opponentRating ?? -Infinity) - (a.opponentRating ?? -Infinity))
            || latestFirst(a, b),
        )[0];
    }

    return null;
};

/*
 * Tournaments
 */

/**
 * How good a tournament result is: number of players ranked below.
 * 3rd out of 8 (5) is better than 2nd out of 3 (1).
 */
export const tournamentResultScore = (tournament: Pick<RetrospectiveTournament, 'rank' | 'participantsCount'>): number =>
    tournament.participantsCount - tournament.rank
;

/**
 * Number of tournaments shown in retrospective, best results first.
 */
export const TOP_TOURNAMENTS_COUNT = 5;

/**
 * Best tournament results, best first.
 */
export const topTournaments = <T extends Pick<RetrospectiveTournament, 'rank' | 'participantsCount'>>(tournaments: T[], count = TOP_TOURNAMENTS_COUNT): T[] =>
    [...tournaments].sort((a, b) =>
        (tournamentResultScore(b) - tournamentResultScore(a))
        || (b.participantsCount - a.participantsCount),
    ).slice(0, count)
;

/**
 * Best tournament result: most players ranked below, then bigger tournament.
 */
export const bestTournament = <T extends Pick<RetrospectiveTournament, 'rank' | 'participantsCount'>>(tournaments: T[]): null | T => {
    return topTournaments(tournaments, 1)[0] ?? null;
};

/*
 * Challenges for next year
 */

export type ChallengesInput = {
    botGames: number;

    tournaments: Pick<RetrospectiveTournament, 'rank'>[];

    ladders: {
        slug: string;
        name: string;
        kingSeconds: number;
        kingAtYearEnd: boolean;
        defenses: number;

        /**
         * Number of ladder games played this year, used as activity weight.
         */
        gamesCount: number;
    }[];

    /**
     * Next bot to beat: weakest bot stronger than strongest beaten bot, if any.
     */
    nextBot: null | RetrospectivePlayerRef;
};

/**
 * Challenges for next year, only relevant ones,
 * prioritized by activities player did the most this year.
 * Never about rating or activity: no incentive to play more or chase rating.
 */
export const pickChallenges = (input: ChallengesInput): RetrospectiveChallenge[] => {
    const weighted: { weight: number, challenge: RetrospectiveChallenge }[] = [];

    if (input.tournaments.length > 0) {
        const bestRank = Math.min(...input.tournaments.map(t => t.rank));

        // Tournaments are rarer than games, so one tournament weights as several games.
        const weight = input.tournaments.length * 10;

        if (bestRank > 3) {
            weighted.push({ weight, challenge: { type: 'tournament_podium' } });
        } else if (bestRank > 1) {
            weighted.push({ weight, challenge: { type: 'tournament_win' } });
        }
    }

    if (input.botGames > 0 && input.nextBot !== null) {
        weighted.push({ weight: input.botGames, challenge: { type: 'beat_bot', bot: input.nextBot } });
    }

    for (const ladder of input.ladders) {
        const weight = ladder.gamesCount * 5;

        const { slug: ladderSlug, name: ladderName } = ladder;

        if (ladder.kingAtYearEnd) {
            weighted.push({ weight, challenge: { type: 'ladder_defenses', ladderSlug, ladderName, defenses: ladder.defenses + 1 } });
        } else if (ladder.kingSeconds > 0) {
            weighted.push({ weight, challenge: { type: 'ladder_reclaim', ladderSlug, ladderName } });
        } else {
            weighted.push({ weight, challenge: { type: 'ladder_king', ladderSlug, ladderName } });
        }
    }

    return weighted
        .sort((a, b) => b.weight - a.weight)
        .slice(0, MAX_CHALLENGES)
        .map(({ challenge }) => challenge)
    ;
};

/*
 * Rival
 */

/**
 * Rival is shown only if played at least this number of games against them.
 */
export const RIVAL_MIN_GAMES = 3;

export type RivalGame<P> = {
    /**
     * Registered human opponent, null for guests and bots.
     */
    opponent: null | P;
    opponentId: null | number;
    won: boolean;
    endedAt: Date;
};

/**
 * Registered opponent played the most, with win/loss record.
 * On equality, the one played the most recently.
 */
export const pickRival = <P>(games: RivalGame<P>[]): null | { opponent: P, wins: number, losses: number } => {
    const byOpponent = new Map<number, { opponent: P, wins: number, losses: number, lastGameAt: number }>();

    for (const game of games) {
        if (game.opponent === null || game.opponentId === null) {
            continue;
        }

        let record = byOpponent.get(game.opponentId);

        if (!record) {
            record = { opponent: game.opponent, wins: 0, losses: 0, lastGameAt: 0 };
            byOpponent.set(game.opponentId, record);
        }

        if (game.won) {
            ++record.wins;
        } else {
            ++record.losses;
        }

        record.lastGameAt = Math.max(record.lastGameAt, game.endedAt.getTime());
    }

    const total = (record: { wins: number, losses: number }) => record.wins + record.losses;

    const rival = [...byOpponent.values()]
        .filter(record => total(record) >= RIVAL_MIN_GAMES)
        .sort((a, b) => (total(b) - total(a)) || (b.lastGameAt - a.lastGameAt))[0]
    ;

    return rival ? { opponent: rival.opponent, wins: rival.wins, losses: rival.losses } : null;
};
