import { HostedGameOptions, Tournament, TournamentGame, TournamentParticipant } from './models/index.js';
import { slugify } from './slugify.js';

export const tournamentFormatStage1Values = [
    'single-elimination',
    'double-elimination',
    'stepladder',
    'swiss',
    'round-robin',
    'double-round-robin',
] as const;

export const tournamentFormatStage2Values = [
    'single-elimination',
    'double-elimination',
    'stepladder',
] as const;

export type TournamentFormatStage1 = (typeof tournamentFormatStage1Values)[number];
export type TournamentFormatStage2 = (typeof tournamentFormatStage2Values)[number];

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
 * @returns Date when tournament should starts automatically, counting delayStart.
 *      Or null if auto start is disabled by host.
 */
export const tournamentStartsAutomatically = (tournament: Tournament): null | Date => {
    const { startOfficialAt: officiallyStartsAt, startDelayInSeconds: delayStartInSeconds } = tournament;

    if (delayStartInSeconds < 0) {
        return null;
    }

    return new Date(officiallyStartsAt.getTime() + delayStartInSeconds * 1000);
};

/**
 * @returns "1.3" for tournament game round 1, number 3
 */
export const tournamentMatchNumber = (tournamentGame: TournamentGame): string => {
    return tournamentGame.round + '.' + tournamentGame.number;
};

/**
 * Sort participants from their score/tiebreak,
 * and set them a rank.
 */
export const sortAndRankParticipants = (participants: TournamentParticipant[]): void => {
    if (0 === participants.length) {
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
