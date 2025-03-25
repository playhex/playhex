import { Body, Get, HttpError, JsonController, NotFoundError, Param, Patch, Post, Put } from 'routing-controllers';
import { Service } from 'typedi';
import { AuthenticatedPlayer } from '../middlewares.js';
import { Player, Tournament, TournamentSubscription } from '../../../../shared/app/models/index.js';
import TournamentRepository from '../../../repositories/TournamentRepository.js';
import { isDuplicateError } from '../../../repositories/typeormUtils.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';
import { instanceToPlain } from '../../../../shared/app/class-transformer-custom.js';

@JsonController()
@Service()
export default class TournamentController
{
    constructor(
        private tournamentRepository: TournamentRepository,
    ) {}

    @Get('/api/tournaments/active')
    async getActiveTournaments()
    {
        return this.tournamentRepository.getActiveTournaments();
    }

    @Get('/api/tournaments')
    async getTournaments()
    {
        return this.tournamentRepository.getEndedTournaments();
    }

    @Get('/api/tournaments/:slug')
    async getTournament(
        @Param('slug') slug: string,
    ) {
        const tournament = await this.tournamentRepository.findBySlugFull(slug);

        if (null === tournament) {
            throw new HttpError(404, `No tournament with slug "${slug}"`);
        }

        // TODO remove. Tmp: iterate tournament when getting it
        // const activeTournament = this.tournamentRepository.getActiveTournament(tournament.publicId);
        // if (null !== activeTournament) {
        //     await activeTournament.iterateTournament();
        //     await this.tournamentRepository.save(tournament);
        // }

        return instanceToPlain(tournament);
    }

    @Post('/api/tournaments')
    async postTournament(
        @AuthenticatedPlayer() host: Player,
        @Body({
            validate: { groups: ['tournament:create'] },
            transform: { groups: ['tournament:create'] },
        }) tournament: Tournament,
    ) {
        try {
            return await this.tournamentRepository.createTournament(tournament, host);
        } catch (e) {
            if (isDuplicateError(e)) {
                throw new DomainHttpError(409, 'tournament_title_duplicate', 'A tournament already exists with same title');
            }

            throw e;
        }
    }

    @Patch('/api/tournaments/:slug')
    async patchTournament(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
        @Body({
            validate: { groups: ['tournament:edit'] },
            transform: { groups: ['tournament:edit'] },
        }) edited: Tournament,
    ) {
        const tournament = await this.tournamentRepository.findBySlugFull(slug);

        if (null === tournament) {
            throw new HttpError(404, 'Tournament not found');
        }

        this.mustBeTournamentHost(tournament, player);

        try {
            return await this.tournamentRepository.editTournament(tournament, edited);
        } catch (e) {
            if (isDuplicateError(e)) {
                throw new DomainHttpError(409, 'tournament_title_duplicate', 'A tournament already exists with same title');
            }

            throw e;
        }
    }

    @Put('/api/tournaments/:slug/subscriptions')
    async putSubscription(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
    ): Promise<TournamentSubscription> {
        const tournament = await this.tournamentRepository.findBySlug(slug);

        if (null === tournament) {
            throw new NotFoundError(`Tournament "${slug}" not found`);
        }

        return await this.tournamentRepository.subscribeCheckIn(tournament, player);
    }

    @Post('/api/tournaments/:slug/iterate')
    async postIterateTournament(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
    ) {
        const tournament = await this.tournamentRepository.findBySlugFull(slug);

        if (null === tournament) {
            throw new HttpError(404, 'Tournament not found');
        }

        this.mustBeTournamentHost(tournament, player);

        const activeTournament = this.tournamentRepository.getActiveTournament(tournament.publicId);

        if (null === activeTournament) {
            throw new HttpError(400, 'Tournament is not active');
        }

        await activeTournament.iterateTournament();

        return activeTournament.getTournament();
    }

    /**
     * Deny access if authenticated player is not the tournament host.
     */
    private mustBeTournamentHost(tournament: Tournament, player: Player): void
    {
        if (tournament.host.publicId !== player.publicId) {
            throw new HttpError(403, 'Only tournament host can do this');
        }
    }
}
