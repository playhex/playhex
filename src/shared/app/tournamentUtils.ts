import { HostedGameOptions, Tournament, TournamentParticipant } from './models/index.js';
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

export const isCheckInOpen = (tournament: Tournament, date: Date = new Date()): boolean => {
    return date >= new Date(tournament.startsAt.getTime() - tournament.checkInOpenOffsetMinutes * 60000);
};

/**
 * Sort participants from their score/tiebreak,
 * and set them a rank.
 */
export const sortAndRankParticipants = (tournament: Tournament): void => {
    if (0 === tournament.participants.length) {
        return;
    }

    tournament.participants.sort((a, b) => {
        let scoreA = a.score;
        let scoreB = b.score;

        if (scoreA === scoreB) {
            scoreA += a.tiebreak;
            scoreB += b.tiebreak;
        }

        return scoreB - scoreA;
    });

    let rank = 1;
    tournament.participants[0].rank = rank;

    for (let i = 1; i < tournament.participants.length; ++i) {
        const participant = tournament.participants[i];
        const previous = tournament.participants[i - 1];

        if (participant.score > previous.score || participant.tiebreak > previous.tiebreak) {
            ++rank;
        }

        participant.rank = rank;
    }
};

/**
 * Sort tournament participants by their rank.
 * If rank is undefined, place them at the end.
 */
export const byRank = (a: TournamentParticipant, b: TournamentParticipant): number => {
    return (a.rank ?? Infinity) - (b.rank ?? Infinity);
};
