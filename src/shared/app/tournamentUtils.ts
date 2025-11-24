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

/**
 * Available seeding methods.
 * - `random`: players are seeded randomly
 * - `rating`: players are seeded by their rating. Stronger players get the bye if any
 * - `rating_random`: players are seeded by their rating, with a part of random depending on their glicko2 rating deviation
 */
export const seedingMethods = [
    'rating',
    'rating_random',
    'random',
] as const;

export type SeedingMethod = (typeof seedingMethods)[number];

export const SEEDING_METHOD_DEFAULT: SeedingMethod = 'rating_random';

export const slugifyTournamentName = (tournamentName: string): string => slugify(tournamentName);

export const createGameOptionsForTournament = (tournament: Tournament): HostedGameOptions => {
    const gameOptions = new HostedGameOptions();

    gameOptions.boardsize = tournament.boardsize;
    gameOptions.timeControlType = tournament.timeControlType;
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
    // Only feature tournaments with a strictly positive value defined in featuredFromInSeconds
    if (tournament.featuredFromInSeconds <= 0) {
        return false;
    }

    // Do not feature a tournament ended too long before
    if (tournament.endedAt) {
        const stopFeaturing = new Date(tournament.endedAt.getTime() + 86400 * 1000);

        if (date > stopFeaturing) {
            return false;
        }
    }

    // Start featuring a tournament featuredFromInSeconds seconds before tournament starts
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
 * Find a player in given tournament.
 *
 * @throws {Error} If no player in this tournament found with this public id
 */
export const findTournamentPlayerByPublicIdStrict = (tournament: Tournament, publicId: string): Player => {
    for (const participant of tournament.participants) {
        if (participant.player.publicId === publicId) {
            return participant.player;
        }
    }

    throw new Error(`Player with public id "${publicId}" not in tournament participants`);
};

/**
 * Find a participant in given tournament.
 *
 * @throws {Error} If no participant found with this public id
 */
export const findParticipantByPlayerStrict = (tournament: Tournament, player: Player): TournamentParticipant => {
    for (const participant of tournament.participants) {
        if (participant.player.publicId === player.publicId) {
            return participant;
        }
    }

    throw new Error(`Player "${player.publicId}" not in tournament participants`);
};

/**
 * Sort participants from their score/tiebreak,
 * and set them a rank.
 *
 * Will reset their ranks to set the calculated one from scores.
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
 * Get player rank if he gets eliminated at a given round in loser bracket:
 *
 * ```
 * loser brackets:
 * ... 9 7 5 4 3rd
 * ... 9 7 5
 * ... 9
 * ... 9
 * ```
 *
 * @param loserBracket Loser bracket returned by groupAndSortTournamentMatches()[1]
 *
 * @returns An array of ranks, indexed by round number, example: [9, 7, 5, 4, 3]
 * => if player is eliminated at round 2, she is 7th
 */
export const calculateRanksOfLosersBracketRounds = (loserBracket: TournamentMatch[][]): number[] => {
    const roundsRank = [];
    let currentRank = 3;

    for (let i = loserBracket.length - 1; i >= 0; --i) {
        roundsRank.unshift(currentRank);
        currentRank += loserBracket[i].length;
    }

    return roundsRank;
};

/**
 * For double elimination, first is the grand winner,
 * second is loser of grand final, and third is winner of petite final,
 * next ones are losers for all previous loser brackets losers, from last to first.
 *
 * ```
 * winner brackets:
 *         ... 1st
 *         ... 2nd
 *
 * loser brackets:
 * ... 9 7 5 4 3rd
 * ... 9 7 5
 * ... 9
 * ... 9
 * ```
 *
 * Should also works for non finished tournaments, players are initialized with lowest rank,
 * then their rank is updated as long as they win matches and progess in bracket.
 */
export const rankParticipantsDoubleElimination = (tournament: Tournament): void => {
    if (tournament.stage1Format !== 'double-elimination') {
        throw new Error('forceDoubleEliminationPodium() called on non double elimination tournament');
    }

    for (const participant of tournament.participants) {
        participant.rank = undefined;
        participant.score = 0;
        participant.tiebreak = 0;
    }

    const [winnerBracket, loserBracket] = groupAndSortTournamentMatches(tournament.matches);
    const grandFinal = winnerBracket[winnerBracket.length - 1][0];

    // Set 1st and 2nd ranks to grand final players
    if (grandFinal.state === 'done') {
        if (!grandFinal.hostedGame) {
            throw new Error('match done but no hostedGame');
        }

        if (grandFinal.hostedGame.winner === null) {
            throw new Error('match done but no winner');
        }

        const winner = getMatchWinnerStrict(grandFinal);
        const loser = getMatchLoserStrict(grandFinal);

        findParticipantByPlayerStrict(tournament, winner).rank = 1;
        findParticipantByPlayerStrict(tournament, loser).rank = 2;
    }

    const eliminatedPlayersRanks = calculateRanksOfLosersBracketRounds(loserBracket);

    // Set definitive ranks to players who have been eliminated
    for (let roundIndex = loserBracket.length - 1; roundIndex >= 0; --roundIndex) {
        for (const match of loserBracket[roundIndex]) {
            const loser = getMatchLoser(match);

            if (loser === null) {
                continue;
            }

            const participant = findParticipantByPlayerStrict(tournament, loser);

            if (participant.rank === undefined) {
                participant.rank = eliminatedPlayersRanks[roundIndex];
            }
        }
    }

    /**
     * Set best rank so far to player the first time we meet them in brackets
     */
    const updateTemporaryRank = (player: null | Player, currentRank: number): void => {
        if (!player) {
            return;
        }

        const participant = findParticipantByPlayerStrict(tournament, player);

        if (participant.rank === undefined) {
            participant.rank = currentRank;
        }
    };

    // For still playing tournaments, set temporary ranks to players: minimum rank they can achieve from their position in brackets.
    for (let roundIndex = Math.min(eliminatedPlayersRanks.length, loserBracket.length, winnerBracket.length) - 1; roundIndex >= 0; --roundIndex) {
        for (const match of winnerBracket[roundIndex] ?? []) {
            updateTemporaryRank(match.player1, eliminatedPlayersRanks[roundIndex]);
            updateTemporaryRank(match.player2, eliminatedPlayersRanks[roundIndex]);
        }

        for (const match of loserBracket[roundIndex] ?? []) {
            updateTemporaryRank(match.player1, eliminatedPlayersRanks[roundIndex]);
            updateTemporaryRank(match.player2, eliminatedPlayersRanks[roundIndex]);
        }
    }

    // Set scores relative to rank to keep their ranks in case we reorder them from scores
    for (const participant of tournament.participants) {
        if (participant.rank === undefined) {
            participant.rank = eliminatedPlayersRanks[0];
        }

        participant.score = eliminatedPlayersRanks[0] - participant.rank + 1;
        participant.tiebreak = 0;
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
    const winner = tournamentMatch.hostedGame?.winner;

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

export const getMatchLoser = (tournamentMatch: TournamentMatch): null | Player => {
    if (tournamentMatch.state !== 'done') {
        return null;
    }

    return getMatchLoserStrict(tournamentMatch);
};

export const getMatchLoserStrict = (tournamentMatch: TournamentMatch): Player => {
    const winner = tournamentMatch.hostedGame?.winner;

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

/**
 * Get number of rounds planned for a Swiss tournament.
 *
 * If organizer defined a number of rounds, returns this value.
 * Else, returns number of rounds based on numbers of players,
 * same value as how many rounds will be played.
 */
export const getSwissTotalRounds = (tournament: Tournament): number => {
    if (tournament.stage1Format !== 'swiss') {
        throw new Error('getSwissTotalRounds called on an non-swiss tournament');
    }

    if (tournament.stage1Rounds !== null && tournament.stage1Rounds > 0) {
        return tournament.stage1Rounds;
    }

    return Math.ceil(Math.log2(tournament.participants.length));
};
