import { HostedGameOptions, Player, Tournament, TournamentMatch, TournamentParticipant } from './models/index.js';
import { slugify } from './slugify.js';

/**
 * All tournament formats supported
 */
export const tournamentFormatStage1Values = [
    'single-elimination',
    'double-elimination',
    'swiss',
    'round-robin',
    // 'stepladder',
    // 'double-round-robin',
] as const;

/**
 * All tournament formats supported for a second stage
 */
export const tournamentFormatStage2Values = [
    // 'single-elimination',
    // 'double-elimination',
    // 'stepladder',
] as const;

export type TournamentFormatStage1 = (typeof tournamentFormatStage1Values)[number];
export type TournamentFormatStage2 = (typeof tournamentFormatStage2Values)[number];

export type ActiveTournamentsFilters = {
    /**
     * Take only tournaments where a given player has subscribed or is participating
     */
    playerPublicId?: string;

    /**
     * Take only featured tournaments at this date
     */
    featured?: boolean;
};

/**
 * Available stage 1 formats for tournament creation/edition
 */
export const availableStage1Formats: TournamentFormatStage1[] = [
    'single-elimination',
    'double-elimination',
    'swiss',
    'round-robin',
];

export const slugifyTournamentName = (tournamentName: string): string => slugify(tournamentName);

export const createGameOptionsForTournament = (tournament: Tournament): HostedGameOptions => {
    const gameOptions = new HostedGameOptions();

    gameOptions.boardsize = tournament.boardsize;
    gameOptions.timeControl = tournament.timeControl;
    gameOptions.ranked = tournament.ranked;

    return gameOptions;
};

export const getCheckInOpensDate = (tournament: Tournament): Date => {
    return new Date(tournament.startOfficialAt.getTime() - tournament.checkInOpenOffsetSeconds * 1000);
};

export const isCheckInOpen = (tournament: Tournament, date: Date = new Date()): boolean => {
    return date >= getCheckInOpensDate(tournament);
};

/**
 * Whether a tournament should be featured now, depending on `tournament.featuredFromInSeconds` field.
 */
export const isFeaturedNow = (tournament: Tournament, date: Date = new Date()): boolean => {
    if (tournament.featuredFromInSeconds <= 0) {
        return false;
    }

    const featuredAfter = new Date(tournament.startOfficialAt.getTime() - tournament.featuredFromInSeconds * 1000);

    return date >= featuredAfter;
};

/**
 * Whether a player has subscribed, or is participant in a tournament.
 */
export const isPlayerInvolved = (tournament: Tournament, playerPublicId: string): boolean => {
    return tournament.subscriptions.some(subscription => subscription.player.publicId === playerPublicId)
        || tournament.participants.some(participant => participant.player.publicId === playerPublicId)
    ;
};

/**
 * @returns Date when tournament should starts automatically, counting delayStart.
 *      Or null if auto start is disabled by organizer.
 */
export const tournamentStartsAutomatically = (tournament: Tournament): null | Date => {
    const { startOfficialAt: officiallyStartsAt, startDelayInSeconds: delayStartInSeconds } = tournament;

    if (delayStartInSeconds < 0) {
        return null;
    }

    return new Date(officiallyStartsAt.getTime() + delayStartInSeconds * 1000);
};

/**
 * Indexes start from 0.
 *
 * @returns "0.2" for tournament match round 1, number 3. Or "0.1.3" if tournament match is in group 0.
 */
export const tournamentMatchKey = (tournamentMatch: TournamentMatch): string => {
    return tournamentMatch.group + '.'
        + tournamentMatch.round + '.'
        + tournamentMatch.number
    ;
};

/**
 * Converts string "0.1.2" to { group: 0, round: 1, number: 2 }
 */
export const parseTournamentMatchKey = (matchKey: string): { group: number, round: number, number: number } => {
    const [group, round, number] = matchKey.split('.');

    return {
        group: parseInt(group, 10),
        round: parseInt(round, 10),
        number: parseInt(number, 10),
    };
};

/**
 * Find a participant in given tournament.
 *
 * @throws {Error} If no participant found with this public id
 */
export const findParticipantByPublicIdStrict = (tournament: Tournament, publicId: string): Player => {
    for (const participant of tournament.participants) {
        if (participant.player.publicId === publicId) {
            return participant.player;
        }
    }

    throw new Error(`Player with public id "${publicId}" not in tournament participants`);
};

/**
 * Sort participants from their score/tiebreak,
 * and set them a rank.
 */
export const sortAndRankParticipants = (participants: TournamentParticipant[]): void => {
    if (participants.length === 0) {
        return;
    }

    participants.sort((a, b) => {
        if (a.score === b.score) {
            return b.tiebreak - a.tiebreak;
        }

        return b.score - a.score;
    });

    participants[0].rank = 1;

    for (let i = 1; i < participants.length; ++i) {
        const participant = participants[i];
        const previous = participants[i - 1];

        if (participant.score === previous.score && participant.tiebreak === previous.tiebreak) {
            participant.rank = previous.rank;
        } else {
            participant.rank = i + 1;
        }
    }
};

/**
 * Sort tournament participants by their rank.
 * If rank is undefined, place them at the end.
 */
export const byRank = (a: TournamentParticipant, b: TournamentParticipant): number => {
    return (a.rank ?? Infinity) - (b.rank ?? Infinity);
};

/**
 * Creates an array of rounds, each containing games sorted by match number.
 * Grouped by groups.
 *
 * - E.g if there is no groups:
 * ```
 * [
 *   [[1.1, 1.2, 1.3, 1.4], [2.1, 2.2], [3.1]],
 * ]
 * ```
 *
 * - or if there is two groups (0 and 1):
 * ```
 * [
 *   [[1.1, 1.2, 1.3, 1.4], [2.1, 2.2], [3.1]],
 *   [[1.1, 1.2], [2.1]],
 * ]
 * ```
 */
export const groupAndSortTournamentMatches = (tournamentMatches: TournamentMatch[]): TournamentMatch[][][] => {
    const rounds: TournamentMatch[][][] = [];

    for (const tournamentMatch of tournamentMatches) {
        const { group, round, number } = tournamentMatch;

        if (!rounds[group]) {
            rounds[group] = [];
        }

        if (!rounds[group][round - 1]) {
            rounds[group][round - 1] = [];
        }

        rounds[group][round - 1][number - 1] = tournamentMatch;
    }

    return rounds;
};

export const findTournamentMatchByRoundAndNumber = (tournament: Tournament, group: number, round: number, number: number): null | TournamentMatch => {
    return tournament.matches
        .find(game => game.group === group && game.round === round && game.number === number)
        ?? null
    ;
};

export const getActiveTournamentMatches = (tournament: Tournament): TournamentMatch[] => {
    return tournament.matches.filter(tournamentMatch => tournamentMatch.state === 'playing');
};

/**
 * Get top players of a tournament, by rank.
 * Can be used to get top 3 players of an ended tournament.
 * Players ranks should be well defined for those top players,
 * i.e ranks = 1 2 3, and not 1 1 3 3
 */
export const getTopPlayers = (tournament: Tournament, top = 3): TournamentParticipant[] => {
    return tournament.participants
        .filter(participant => (typeof participant.rank === 'number') && participant.rank <= top)
        .sort(byRank)
        .slice(0, 3)
    ;
};

export const getMatchWinnerStrict = (tournamentMatch: TournamentMatch): Player => {
    const winner = tournamentMatch.hostedGame?.gameData?.winner;

    if (winner !== 0 && winner !== 1) {
        throw new Error('getMatchWinnerStrict called but no winner');
    }

    const { player1, player2 } = tournamentMatch;

    if (!player1 || !player2) {
        throw new Error('getMatchWinnerStrict called but missing player');
    }

    return winner === 0
        ? player1
        : player2
    ;
};

export const getMatchLoserStrict = (tournamentMatch: TournamentMatch): Player => {
    const winner = tournamentMatch.hostedGame?.gameData?.winner;

    if (winner !== 0 && winner !== 1) {
        throw new Error('getMatchLoserStrict called but no winner');
    }

    const { player1, player2 } = tournamentMatch;

    if (!player1 || !player2) {
        throw new Error('getMatchLoserStrict called but missing player');
    }

    return winner === 1
        ? player1
        : player2
    ;
};
