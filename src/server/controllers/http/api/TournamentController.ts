import { Body, Get, HttpError, JsonController, NotFoundError, Param, Post, Put } from 'routing-controllers';
import { Service } from 'typedi';
import { AuthenticatedPlayer } from '../middlewares.js';
import { Player, TournamentCreateDTO } from '../../../../shared/app/models/index.js';
import TournamentRepository from '../../../repositories/TournamentRepository.js';
import { isDuplicateError } from '../../../repositories/typeormUtils.js';

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
        const activeTournament = this.tournamentRepository.getActiveTournament(tournament.publicId);
        if (null !== activeTournament) {
            await activeTournament.iterateTournament();
            await this.tournamentRepository.save(tournament);
        }

        return tournament;
    }

    @Post('/api/tournaments')
    async postTournament(
        @AuthenticatedPlayer() host: Player,
        @Body() tournamentCreateDTO: TournamentCreateDTO,
    ) {
        try {
            return await this.tournamentRepository.createTournament(tournamentCreateDTO, host);
        } catch (e) {
            if (isDuplicateError(e)) {
                throw new HttpError(409, 'A tournament already exists with same name');
            }

            throw e;
        }
    }

    @Put('/api/tournaments/:slug/subscriptions')
    async putSubscription(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
    ) {
        const tournament = await this.tournamentRepository.findBySlug(slug);

        if (null === tournament) {
            throw new NotFoundError(`Tournament "${slug}" not found`);
        }

        return await this.tournamentRepository.subscribeCheckIn(tournament, player);
    }
}
