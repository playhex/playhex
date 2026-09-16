import { Service } from 'typedi';
import { Tournament, TournamentSeries } from '../../../shared/app/models/index.js';
import { cloneTournament, createTournamentDefaultsCreate } from '../../../shared/app/models/Tournament.js';
import { nextSeriesTitle } from '../../../shared/app/tournamentSeriesUtils.js';
import { slugifyTournamentName } from '../../../shared/app/tournamentUtils.js';
import TournamentRepository from '../../repositories/TournamentRepository.js';
import TournamentSeriesRepository from '../../repositories/TournamentSeriesRepository.js';
import TournamentStore from '../../store/TournamentStore.js';
import logger from '../../services/logger.js';

/**
 * Creates the next instance of a series, server side.
 *
 * Does the same as what organizer does with "create next instance" button:
 * clone the last instance, resolve title from the series title pattern,
 * and set the start date.
 */
@Service()
export class TournamentSeriesInstanceCreator
{
    constructor(
        private tournamentRepository: TournamentRepository,
        private tournamentSeriesRepository: TournamentSeriesRepository,
        private tournamentStore: TournamentStore,
    ) {}

    /**
     * Creates an instance of a series, starting at a given date.
     *
     * Returns null when the series has no instance to clone:
     * tournament parameters cannot be guessed.
     */
    async createInstance(tournamentSeries: TournamentSeries, startsAt: Date): Promise<null | Tournament>
    {
        const source = await this.tournamentRepository.findLastToCloneBySeries(tournamentSeries.id);

        if (source === null) {
            logger.warning('Cannot create next instance of a series: no tournament to clone', {
                tournamentSeriesSlug: tournamentSeries.slug,
            });

            return null;
        }

        const tournament = createTournamentDefaultsCreate();

        cloneTournament(tournament, source);

        // cloneTournament() is made for the clone button: it adds " (clone)" to the title
        // and drops admins. Here we want the series title, and same admins as previous instance.
        const n = await this.tournamentSeriesRepository.countNonCanceledTournaments(tournamentSeries.id) + 1;

        tournament.title = nextSeriesTitle(tournamentSeries, n, startsAt);
        tournament.slug = await this.generateFreeSlug(tournament.title);
        tournament.startOfficialAt = startsAt;

        const created = await this.tournamentStore.createTournament(tournament, source.organizer, tournamentSeries);

        // Admins cannot be set at creation, they are always added afterwards
        if (source.admins.length > 0) {
            await this.tournamentStore
                .getActiveTournament(created.publicId)
                ?.changeTournamentAdmins(source.admins.map(admin => admin.player))
            ;
        }

        return created;
    }

    /**
     * Slug from title, suffixed with "-2", "-3", ... if already taken.
     * Unlike organizer who gets an error and can change the title,
     * auto created tournaments must go through.
     */
    private async generateFreeSlug(title: string): Promise<string>
    {
        const slug = slugifyTournamentName(title);

        if (!await this.tournamentStore.slugExists(slug)) {
            return slug;
        }

        for (let i = 2; i < 100; ++i) {
            if (!await this.tournamentStore.slugExists(`${slug}-${i}`)) {
                return `${slug}-${i}`;
            }
        }

        throw new Error(`Could not generate a free slug from title "${title}"`);
    }
}
