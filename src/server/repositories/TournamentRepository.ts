import { Inject, Service } from 'typedi';
import { FindOptionsRelations, In, Repository } from 'typeorm';
import { Tournament } from '../../shared/app/models/index.js';

/**
 * Relations to load for active tournament.
 *
 * With these relations, must add relationLoadStrategy: 'query'
 * as typeorm parameter (e.g in find(), findOne(), ...)
 * to prevent join all relation at once and fetch thousands of rows.
 */
const relations: FindOptionsRelations<Tournament> = {
    organizer: true,
    series: true,
    subscriptions: {
        player: {
            currentRating: true,
        },
    },
    participants: {
        player: {
            currentRating: true,
        },
    },
    admins: {
        player: true,
    },
    matches: {
        player1: {
            currentRating: true,
        },
        player2: {
            currentRating: true,
        },
        game: {
            gameToPlayers: {
                player: {
                    currentRating: true,
                },
            },
        },
    },
    history: true,
};


@Service()
export default class TournamentRepository
{
    constructor(
        @Inject('Repository<Tournament>')
        private tournamentRepository: Repository<Tournament>,
    ) {}

    async save(tournament: Tournament): Promise<Tournament>
    {
        return await this.tournamentRepository.save(tournament);
    }

    async findActiveTournaments(): Promise<Tournament[]>
    {
        return await this.tournamentRepository.find({
            relations,
            where: {
                state: In<Tournament['state']>(['created', 'running']),
            },
            relationLoadStrategy: 'query',
        });
    }

    async findBySlug(slug: string): Promise<null | Tournament>
    {
        return await this.tournamentRepository.findOne({
            where: { slug },
            relations: {
                organizer: true,
            },
        });
    }

    async findBySlugFull(slug: string): Promise<null | Tournament>
    {
        return await this.tournamentRepository.findOne({
            relations,
            where: { slug },
            relationLoadStrategy: 'query',
        });
    }

    async slugExists(slug: string): Promise<boolean>
    {
        return await this.tournamentRepository.existsBy({ slug });
    }

    /**
     * All tournaments of a series. Active ones may be outdated,
     * up to date instances are in TournamentStore.
     */
    async findBySeries(tournamentSeriesId: number): Promise<Tournament[]>
    {
        return await this.tournamentRepository.find({
            relations: {
                participants: {
                    player: true,
                },
            },
            where: {
                series: { id: tournamentSeriesId },
            },
            order: {
                startOfficialAt: 'desc',
            },
            relationLoadStrategy: 'query',
        });
    }

    /**
     * Most recent ended tournament of a series, or null if none ended yet.
     *
     * Used to show a series in a list, where loading all its instances would be too much.
     */
    async findLastEndedBySeries(tournamentSeriesId: number): Promise<null | Tournament>
    {
        return await this.tournamentRepository.findOne({
            relations: {
                participants: {
                    player: true,
                },
            },
            where: {
                series: { id: tournamentSeriesId },
                state: 'ended',
            },
            order: {
                startOfficialAt: 'desc',
            },
            relationLoadStrategy: 'query',
        });
    }

    async findEndedTournaments(): Promise<Tournament[]>
    {
        return await this.tournamentRepository.find({
            relations: {
                organizer: true,
                participants: {
                    player: true,
                },
            },
            where: {
                state: 'ended',
            },
            order: {
                endedAt: 'desc',
                participants: {
                    rank: 'desc',
                },
            },
        });
    }
}
