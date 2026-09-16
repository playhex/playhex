import { Inject, Service } from 'typedi';
import { FindOptionsRelations, IsNull, Not, Repository } from 'typeorm';
import { Tournament, TournamentSeries } from '../../shared/app/models/index.js';

const relations: FindOptionsRelations<TournamentSeries> = {
    host: true,
    admins: {
        player: true,
    },
};

@Service()
export default class TournamentSeriesRepository
{
    constructor(
        @Inject('Repository<TournamentSeries>')
        private tournamentSeriesRepository: Repository<TournamentSeries>,
    ) {}

    async save(tournamentSeries: TournamentSeries): Promise<TournamentSeries>
    {
        return await this.tournamentSeriesRepository.save(tournamentSeries);
    }

    async remove(tournamentSeries: TournamentSeries): Promise<void>
    {
        await this.tournamentSeriesRepository.remove(tournamentSeries);
    }

    async findAll(): Promise<TournamentSeries[]>
    {
        return await this.tournamentSeriesRepository.find({
            relations,
            order: { createdAt: 'desc' },
            relationLoadStrategy: 'query',
        });
    }

    async findBySlug(slug: string): Promise<null | TournamentSeries>
    {
        return await this.tournamentSeriesRepository.findOne({
            relations,
            where: { slug },
            relationLoadStrategy: 'query',
        });
    }

    async findByPublicId(publicId: string): Promise<null | TournamentSeries>
    {
        return await this.tournamentSeriesRepository.findOne({
            relations,
            where: { publicId },
            relationLoadStrategy: 'query',
        });
    }

    /**
     * All series which create their next instances automatically.
     */
    async findAutoCreateEnabled(): Promise<TournamentSeries[]>
    {
        return await this.tournamentSeriesRepository.find({
            relations,
            where: {
                autoCreate: true,
                autoCreateSchedule: Not(IsNull()),
            },
            relationLoadStrategy: 'query',
        });
    }

    async slugExists(slug: string): Promise<boolean>
    {
        return await this.tournamentSeriesRepository.existsBy({ slug });
    }

    async countTournaments(tournamentSeriesId: number): Promise<number>
    {
        return await this.tournamentSeriesRepository.manager.countBy(Tournament, {
            series: { id: tournamentSeriesId },
        });
    }

    /**
     * Used to calculate {n} of the next instance of this series.
     */
    async countNonCanceledTournaments(tournamentSeriesId: number): Promise<number>
    {
        return await this.tournamentSeriesRepository.manager.countBy(Tournament, {
            series: { id: tournamentSeriesId },
            state: Not<Tournament['state']>('canceled'),
        });
    }

    /**
     * Same as countNonCanceledTournaments(), but for all series at once,
     * to prevent doing a query per series when listing them.
     *
     * Returns counts indexed by series id. Series without any tournament are in the map, with 0.
     */
    async countNonCanceledTournamentsBySeries(): Promise<Map<number, number>>
    {
        const rows: { seriesId: number, tournamentsCount: number }[] = await this.tournamentSeriesRepository
            .createQueryBuilder('tournamentSeries')
            .select('tournamentSeries.id', 'seriesId')
            .addSelect('COUNT(tournament.id)', 'tournamentsCount')
            .leftJoin(
                'tournamentSeries.tournaments',
                'tournament',
                'tournament.state != :canceled',
                { canceled: 'canceled' satisfies Tournament['state'] },
            )
            .groupBy('tournamentSeries.id')
            .getRawMany()
        ;

        return new Map(rows.map(row => [Number(row.seriesId), Number(row.tournamentsCount)]));
    }
}
