/**
 * Data of a player yearly retrospective, computed once by "generate-retrospectives" command.
 */

export const RETROSPECTIVE_DATA_VERSION = 1;

export type RetrospectivePlayerRef = {
    publicId: string;
    pseudo: string;
    slug: string;
    isBot: boolean;
};

export type RetrospectivePercentileKey =
    | 'games1v1'
    | 'livePlaySeconds'
    | 'activeDays'
    | 'chatMessages'
    | 'rankedWins'
    | 'rating'
    | 'accuracy'
    | 'movesPlayed'
    | 'liveThinkingSeconds'
;

export type RetrospectiveTournament = {
    publicId: string;
    slug: string;
    title: string;
    endedAt: string;
    rank: number;
    participantsCount: number;
};

export type RetrospectiveLadder = {
    slug: string;
    name: string;

    /**
     * Best position reached during the year (1 = king).
     */
    bestPosition: null | number;

    /**
     * When best position was first reached during the year, to place it on activity calendar.
     */
    bestPositionAt: null | string;

    /**
     * Number of successful defenses as king during the year.
     */
    defenses: number;

    /**
     * Time spent as king during the year, in seconds.
     */
    kingSeconds: number;

    /**
     * Whether player was still king at end of year.
     */
    kingAtYearEnd: boolean;

    /**
     * Number of challenges played during the year, as challenger or defender.
     */
    challengesCount: number;

    /**
     * Challenges won, as challenger or defender.
     */
    challengesWon: number;

    /**
     * Longest series of consecutive challenges won during the year.
     */
    bestWinStreak: number;
};

export type RetrospectiveGameOfTheYearKind = 'tournament' | 'ladder' | 'opponent';

/**
 * Where a game was played: tournament match, King of the Hill challenge, or casual game.
 */
export type RetrospectiveGameContext = {
    kind: RetrospectiveGameOfTheYearKind;

    /**
     * Set when kind = tournament
     */
    tournamentTitle?: string;
    tournamentRound?: number;
    tournamentMatchNumber?: number;

    /**
     * Translation key of match, e.g "final", see TournamentMatch.label.
     */
    tournamentMatchLabel?: null | string;

    /**
     * Set when kind = ladder: place at stake (defender place before the game).
     */
    ladderPlace?: number;
};

export type RetrospectiveGameOfTheYear = RetrospectiveGameContext & {
    gamePublicId: string;
    opponent: RetrospectivePlayerRef;

    /**
     * Final position of the game, to display the board.
     */
    boardsize: number;
    swapRule: boolean;
    moves: string[];
};

export type RetrospectiveBlunder = {
    gamePublicId: string;
    opponent: RetrospectivePlayerRef;
    boardsize: number;

    context: RetrospectiveGameContext;

    move: string;
    bestMove: null | string;

    /**
     * Game moves until the blunder (included), to display the position.
     */
    moves: string[];
    swapRule: boolean;
};

export type RetrospectiveChallenge =
    | { type: 'tournament_podium' }
    | { type: 'tournament_win' }
    | { type: 'beat_bot', bot: RetrospectivePlayerRef }
    | { type: 'ladder_king', ladderSlug: string, ladderName: string }
    | { type: 'ladder_reclaim', ladderSlug: string, ladderName: string }
    | { type: 'ladder_defenses', ladderSlug: string, ladderName: string, defenses: number }
;

export type RetrospectiveTrend = 'up' | 'down' | 'same';

/**
 * Comparison with previous year retrospective, if any.
 * Values are compared directly, not their top percents.
 */
export type RetrospectiveProgress = {
    previousYear: number;

    /**
     * Previous year values, compared directly (not their top percents).
     */
    games1v1: number;
    activeDays: number;
    livePlaySeconds: number;
    chatMessages: number;
    rankedWins: number;
    movesPlayed: number;
    liveThinkingSeconds: number;

    /**
     * Previous year end rating, if confident.
     */
    rating: null | number;

    /**
     * Previous year accuracy, if computed.
     */
    accuracy: null | number;

    ladders: {
        slug: string;
        bestPosition: null | number;
        defenses: number;
        kingSeconds: number;
    }[];
};

export type PlayerRetrospectiveData = {
    dataVersion: number;
    year: number;

    player: RetrospectivePlayerRef;

    /**
     * Number of full years since player arrived on PlayHex (createdAt), at end of retrospective year.
     */
    yearsOnPlayhex: number;

    games1v1: number;
    botGames: number;
    chatMessages: number;
    activeDays: number;

    /**
     * Live games only (no correspondence).
     */
    livePlaySeconds: number;
    liveThinkingSeconds: number;

    rankedWins: number;

    /**
     * Moves played in all games, bots included: stones, swaps and passes.
     */
    movesPlayed: number;

    /**
     * Number of different human opponents met this year.
     */
    distinctOpponents: number;

    /**
     * Registered opponent player played the most this year, see pickRival().
     */
    rival: null | {
        opponent: RetrospectivePlayerRef;
        wins: number;
        losses: number;
    };

    /**
     * Games played (1v1 and bots) each month, by end date, January first. Always 12 values.
     */
    gamesByMonth: number[];

    /**
     * Overall rating at end of year, only if confident.
     */
    rating: null | number;

    /**
     * Top X% among active players of the year, for each criterion.
     * Missing when not computed yet, or not applicable (i.e rating not confident).
     */
    topPercents: Partial<Record<RetrospectivePercentileKey, number>>;

    /**
     * Strongest opponent beaten in a ranked game, by current rating at generation time:
     * an opponent who lost a lot of rating since is not considered strong.
     */
    strongestOpponentBeaten: null | {
        opponent: RetrospectivePlayerRef;
        gamePublicId: string;

        /**
         * Final position of the game, to display the board.
         */
        boardsize: number;
        swapRule: boolean;
        moves: string[];
    };

    /**
     * Mean win rate kept per move, between 0 and 1, on analyzed ranked games.
     * Null if not enough analyzed ranked games.
     */
    accuracy: null | number;

    /**
     * Analyzed ranked games, used for accuracy.
     */
    analyzedGamesCount: number;

    tournaments: RetrospectiveTournament[];
    tournamentMatchesWon: number;

    /**
     * Tournament games ended, without forfeits.
     */
    tournamentMatchesPlayed: number;
    bestTournament: null | RetrospectiveTournament;

    ladders: RetrospectiveLadder[];

    gameOfTheYear: null | RetrospectiveGameOfTheYear;
    blunder: null | RetrospectiveBlunder;

    progress: null | RetrospectiveProgress;
    challenges: RetrospectiveChallenge[];
};

/**
 * Link to another retrospective of the same player.
 */
export type RetrospectiveLink = {
    year: number;
    shareCode: string;
};

/**
 * Summary returned in retrospectives list.
 */
export type PlayerRetrospectiveSummary = {
    year: number;

    /**
     * Required in retrospective url.
     */
    shareCode: string;
    games1v1: number;
};
