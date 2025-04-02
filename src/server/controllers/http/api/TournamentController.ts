import { v4 as uuidv4 } from 'uuid';
import { Body, Get, HttpError, JsonController, Param, Post } from 'routing-controllers';
import { Service } from 'typedi';
import { AuthenticatedPlayer } from '../middlewares.js';
import { Player, Tournament } from '../../../../shared/app/models/index.js';
import { slugifyTournamentName } from '../../../../shared/app/tournamentUtils.js';
import TournamentRepository from '../../../repositories/TournamentRepository.js';
import { isDuplicateError } from '../../../repositories/typeormUtils.js';
import { GROUP_DEFAULT } from '../../../../shared/app/class-transformer-custom.js';

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
        return await this.tournamentRepository.getActiveTournaments();
    }

    @Get('/api/tournaments/:slug')
    async getTournament(
        @Param('slug') slug: string,
    ) {
        const tournament = await this.tournamentRepository.findBySlug(slug);

        if (null === tournament) {
            throw new HttpError(404, `No tournament with slug "${slug}"`);
        }

        await this.tournamentRepository.iterateTournament(tournament);

        await this.tournamentRepository.save(tournament);

        return tournament;
    }

    @Post('/api/tournaments')
    async postTournament(
        @AuthenticatedPlayer() host: Player,
        @Body({
            transform: { groups: ['tournament:create'] },
        }) tournament: Tournament,
    ) {
        tournament.publicId = uuidv4();
        tournament.host = host;
        tournament.slug = slugifyTournamentName(tournament.title);
        tournament.createdAt = new Date();

        try {
            return await this.tournamentRepository.save(tournament);
        } catch (e) {
            if (isDuplicateError(e)) {
                throw new HttpError(409, 'A tournament already exists with same name');
            }

            throw e;
        }
    }
}
