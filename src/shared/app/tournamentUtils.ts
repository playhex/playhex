import { TournamentParticipant } from './models/index.js';
import { slugify } from './slugify.js';

export const slugifyTournamentName = (tournamentName: string): string => slugify(tournamentName);

/**
 * Sort tournament participants by their rank.
 * If rank is undefined, place them at the end.
 */
export const byRank = (a: TournamentParticipant, b: TournamentParticipant): number => {
    return (a.rank ?? Infinity) - (b.rank ?? Infinity);
};
