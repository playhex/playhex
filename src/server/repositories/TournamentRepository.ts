import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Tournament } from '../../shared/app/models/index.js';

@Service()
export default class TournamentRepository
{
    constructor(
        @Inject('Repository<Tournament>')
        private tournamentRepository: Repository<Tournament>,
    ) {}

    async findAll(): Promise<null | Tournament[]>
    {
        return await this.tournamentRepository.find();
    }

    async findBySlug(slug: string): Promise<null | Tournament>
    {
        return await this.tournamentRepository.findOne({
            where: { slug },
            relations: {
                participants: {
                    player: true,
                },
            },
        });
    }

    async save(tournament: Tournament): Promise<Tournament>
    {
        return this.tournamentRepository.save(tournament);
    }
}
