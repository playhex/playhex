import { Service } from 'typedi';
import { TournamentSeries } from '../../../shared/app/models/index.js';
import { errorToLogger } from '../../../shared/app/utils.js';
import { nextOccurrences } from '../../../shared/app/tournamentSeriesSchedule.js';
import TournamentRepository from '../../repositories/TournamentRepository.js';
import TournamentSeriesRepository from '../../repositories/TournamentSeriesRepository.js';
import { TournamentSeriesInstanceCreator } from '../../tournaments/services/TournamentSeriesInstanceCreator.js';
import logger from '../logger.js';

/**
 * Loops over series having auto create enabled,
 * and creates their next instances when their creation date is reached.
 */
@Service()
export class TournamentSeriesAutoCreate
{
    /**
     * In milliseconds, how often to check whether an instance should be created.
     * Instances are created weeks before they start, so there is no need to be precise.
     */
    private CHECK_SERIES_EVERY = 6 * 3600 * 1000;

    /**
     * How many next occurrences of a schedule to check.
     * More than one to catch up occurrences missed while server was down.
     */
    private OCCURRENCES_TO_CHECK = 5;

    private intervalThread: null | NodeJS.Timeout = null;

    constructor(
        private tournamentSeriesRepository: TournamentSeriesRepository,
        private tournamentRepository: TournamentRepository,
        private tournamentSeriesInstanceCreator: TournamentSeriesInstanceCreator,
    ) {}

    /**
     * Create due instances now, and periodically.
     */
    startWatchingSeries(): void
    {
        if (this.intervalThread !== null) {
            logger.warning('Calling startWatchingSeries() but already watching');
            return;
        }

        void this.checkAllSeries();
        this.intervalThread = setInterval(
            () => void this.checkAllSeries(),
            this.CHECK_SERIES_EVERY,
        );
    }

    stopWatchingSeries(): void
    {
        if (this.intervalThread === null) {
            logger.warning('Calling stopWatchingSeries() but not watching');
            return;
        }

        clearInterval(this.intervalThread);
        this.intervalThread = null;
    }

    /**
     * Check all series having auto create enabled, and create their due instances.
     * An error on a series must not prevent other series from being processed.
     */
    async checkAllSeries(): Promise<void>
    {
        const allSeries = await this.tournamentSeriesRepository.findAutoCreateEnabled();

        logger.debug('Check tournament series to auto create next instance', { count: allSeries.length });

        for (const tournamentSeries of allSeries) {
            await this.checkSeries(tournamentSeries);
        }
    }

    /**
     * Check a single series, and create its due instances.
     *
     * Also called when organizer saves a schedule, to apply it right away
     * instead of waiting for the next check.
     *
     * Errors are logged, never thrown: they must not prevent other series
     * from being processed, nor make saving a schedule fail.
     */
    async checkSeries(tournamentSeries: TournamentSeries): Promise<void>
    {
        try {
            await this.createDueInstances(tournamentSeries);
        } catch (e) {
            logger.error('Error while auto creating next instance of a series', {
                ...errorToLogger(e),
                tournamentSeriesSlug: tournamentSeries.slug,
            });
        }
    }

    private async createDueInstances(tournamentSeries: TournamentSeries): Promise<void>
    {
        const { autoCreateSchedule, autoCreateOffsetSeconds } = tournamentSeries;

        if (autoCreateSchedule === null || autoCreateOffsetSeconds === null) {
            return;
        }

        const now = new Date();
        const occurrences = nextOccurrences(autoCreateSchedule, now, this.OCCURRENCES_TO_CHECK);

        for (const startsAt of occurrences) {
            // Not yet time to create this one, and next ones are even later
            if (startsAt.getTime() - autoCreateOffsetSeconds * 1000 > now.getTime()) {
                break;
            }

            // Already created, either by a previous check or manually by organizer
            if (await this.tournamentRepository.existsBySeriesAndStartOfficialAt(tournamentSeries.id, startsAt)) {
                continue;
            }

            const tournament = await this.tournamentSeriesInstanceCreator.createInstance(tournamentSeries, startsAt);

            if (tournament !== null) {
                logger.info('Auto created next instance of a series', {
                    tournamentSeriesSlug: tournamentSeries.slug,
                    tournamentSlug: tournament.slug,
                    startOfficialAt: startsAt.toISOString(),
                });
            }
        }
    }
}
