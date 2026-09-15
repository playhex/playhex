import { Body, Delete, Get, JsonController, NotFoundError, Param, Patch, Post, Put } from 'routing-controllers';
import { Service } from 'typedi';
import { AuthenticatedPlayer, mustBeTournamentSeriesHostOrAdmin } from '../middlewares.js';
import { Player, Tournament, TournamentSeries } from '../../../../shared/app/models/index.js';
import { createTournamentSeriesFromCreateInput } from '../../../../shared/app/models/TournamentSeries.js';
import { sortTournaments, TournamentSeriesDto, TournamentSeriesListItemDto } from '../../../../shared/app/models/TournamentSeriesDto.js';
import { slugifyTournamentName } from '../../../../shared/app/tournamentUtils.js';
import { deduplicatePlayers } from '../../../../shared/app/playerUtils.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';
import { isDuplicateError } from '../../../repositories/typeormUtils.js';
import TournamentSeriesRepository from '../../../repositories/TournamentSeriesRepository.js';
import TournamentRepository from '../../../repositories/TournamentRepository.js';
import PlayerRepository from '../../../repositories/PlayerRepository.js';
import TournamentStore from '../../../store/TournamentStore.js';
import TournamentSeriesAdmin from '../../../../shared/app/models/TournamentSeriesAdmin.js';

@JsonController()
@Service()
export default class TournamentSeriesController
{
    constructor(
        private tournamentSeriesRepository: TournamentSeriesRepository,
        private tournamentRepository: TournamentRepository,
        private playerRepository: PlayerRepository,
        private tournamentStore: TournamentStore,
    ) {}

    @Get('/api/tournament-series')
    async getTournamentSeriesList()
    {
        const allSeries = await this.tournamentSeriesRepository.findAll();
        const tournamentsCounts = await this.tournamentSeriesRepository.countNonCanceledTournamentsBySeries();

        return await Promise.all(allSeries.map(async tournamentSeries => TournamentSeriesListItemDto.fromTournamentSeries(
            tournamentSeries,
            {
                tournamentsCount: tournamentsCounts.get(tournamentSeries.id) ?? 0,

                // Most recent running one, and soonest upcoming one
                running: this.getSeriesActiveTournaments(tournamentSeries, 'running').shift() ?? null,
                next: this.getSeriesActiveTournaments(tournamentSeries, 'created').pop() ?? null,

                lastEnded: await this.getSeriesLastEndedTournament(tournamentSeries),
            },
        )));
    }

    @Get('/api/tournament-series/:slug')
    async getTournamentSeries(
        @Param('slug') slug: string,
    ) {
        const tournamentSeries = await this.mustFindBySlug(slug);
        const tournaments = await this.getSeriesTournaments(tournamentSeries);
        const nextTournamentNumber = await this.tournamentSeriesRepository.countNonCanceledTournaments(tournamentSeries.id) + 1;

        return TournamentSeriesDto.fromTournamentSeries(tournamentSeries, tournaments, nextTournamentNumber);
    }

    @Post('/api/tournament-series')
    async postTournamentSeries(
        @AuthenticatedPlayer() host: Player,
        @Body({
            validate: { groups: ['tournamentSeries:create'] },
            transform: { groups: ['tournamentSeries:create'] },
        }) input: TournamentSeries,
    ) {
        const tournamentSeries = createTournamentSeriesFromCreateInput(input);

        tournamentSeries.host = host;

        try {
            return await this.tournamentSeriesRepository.save(tournamentSeries);
        } catch (e) {
            throw this.rethrowDuplicate(e);
        }
    }

    /**
     * Patch endpoint uses publicId as identifier because slug can be edited
     */
    @Patch('/api/tournament-series/:publicId')
    async patchTournamentSeries(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Body({
            validate: { groups: ['tournamentSeries:edit'] },
            transform: { groups: ['tournamentSeries:edit'] },
        }) edited: TournamentSeries,
    ) {
        const tournamentSeries = await this.tournamentSeriesRepository.findByPublicId(publicId);

        if (tournamentSeries === null) {
            throw new NotFoundError(`No tournament series with public id "${publicId}"`);
        }

        mustBeTournamentSeriesHostOrAdmin(tournamentSeries, player);

        tournamentSeries.title = edited.title;
        tournamentSeries.slug = edited.slug ? slugifyTournamentName(edited.slug) : slugifyTournamentName(edited.title);
        tournamentSeries.description = edited.description;
        tournamentSeries.titlePattern = edited.titlePattern || null;

        try {
            return await this.tournamentSeriesRepository.save(tournamentSeries);
        } catch (e) {
            throw this.rethrowDuplicate(e);
        }
    }

    @Put('/api/tournament-series/:slug/admins')
    async putTournamentSeriesAdmins(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
        @Body() players: Player[],
    ) {
        const tournamentSeries = await this.mustFindBySlug(slug);

        mustBeTournamentSeriesHostOrAdmin(tournamentSeries, player);

        const loadedPlayers = await Promise.all(players.map(player => this.playerRepository.getPlayer(player.publicId)));

        if (!loadedPlayers.every(player => player !== null)) {
            throw new NotFoundError(`One of these publicIds does not belong to a player: "${players.map(p => p.publicId).join('", "')}"`);
        }

        const previousAdmins = tournamentSeries.admins;

        tournamentSeries.admins = deduplicatePlayers(loadedPlayers).map(loadedPlayer => {
            const previousAdmin = previousAdmins
                .find(admin => admin.player.publicId === loadedPlayer.publicId)
            ;

            if (previousAdmin) {
                return previousAdmin;
            }

            const admin = new TournamentSeriesAdmin();

            admin.player = loadedPlayer;
            admin.tournamentSeries = tournamentSeries;

            return admin;
        });

        await this.tournamentSeriesRepository.save(tournamentSeries);
    }

    @Delete('/api/tournament-series/:slug')
    async deleteTournamentSeries(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
    ): Promise<void> {
        const tournamentSeries = await this.mustFindBySlug(slug);

        mustBeTournamentSeriesHostOrAdmin(tournamentSeries, player);

        if (await this.tournamentSeriesRepository.countTournaments(tournamentSeries.id) > 0) {
            throw new DomainHttpError(409, 'tournament_series_has_tournaments', 'Cannot delete a series having tournaments');
        }

        await this.tournamentSeriesRepository.remove(tournamentSeries);
    }

    private async mustFindBySlug(slug: string): Promise<TournamentSeries>
    {
        const tournamentSeries = await this.tournamentSeriesRepository.findBySlug(slug);

        if (tournamentSeries === null) {
            throw new NotFoundError(`No tournament series with slug "${slug}"`);
        }

        return tournamentSeries;
    }

    /**
     * Active tournaments are up to date in memory only,
     * so take them from store, and others from database.
     */
    private async getSeriesTournaments(tournamentSeries: TournamentSeries): Promise<Tournament[]>
    {
        const activeTournaments = this.tournamentStore.getActiveTournaments()
            .filter(tournament => tournament.series?.publicId === tournamentSeries.publicId)
        ;

        const activePublicIds = new Set(activeTournaments.map(tournament => tournament.publicId));

        const persistedTournaments = (await this.tournamentRepository.findBySeries(tournamentSeries.id))
            .filter(tournament => !activePublicIds.has(tournament.publicId))
        ;

        return [...activeTournaments, ...persistedTournaments];
    }

    /**
     * Running or upcoming tournaments of a series, most recent first.
     * They are all in store, active tournaments in database may be outdated.
     */
    private getSeriesActiveTournaments(tournamentSeries: TournamentSeries, state: 'created' | 'running'): Tournament[]
    {
        return sortTournaments(this.tournamentStore.getActiveTournaments()
            .filter(tournament => tournament.state === state && tournament.series?.publicId === tournamentSeries.publicId),
        );
    }

    /**
     * Most recent ended tournament of a series, or null if none ended yet.
     * A tournament stays in store once ended, prefer this instance, more up to date than database one.
     */
    private async getSeriesLastEndedTournament(tournamentSeries: TournamentSeries): Promise<null | Tournament>
    {
        const lastEnded = await this.tournamentRepository.findLastEndedBySeries(tournamentSeries.id);

        if (lastEnded === null) {
            return null;
        }

        return this.tournamentStore.getActiveTournament(lastEnded.publicId)?.getTournament() ?? lastEnded;
    }

    private rethrowDuplicate(e: unknown): unknown
    {
        if (isDuplicateError(e)) {
            return new DomainHttpError(409, 'tournament_series_slug_duplicate', 'A tournament series already exists with same url name');
        }

        return e;
    }
}
