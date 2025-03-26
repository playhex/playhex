import { slugify } from './slugify.js';

export const slugifyTournamentName = (tournamentName: string): string => slugify(tournamentName);
