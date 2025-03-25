import { Inject, Service } from 'typedi';
import { In, Repository } from 'typeorm';
import { HostedGame, HostedGameOptions, Player, Tournament, TournamentCreateDTO, TournamentGame, TournamentSubscription } from '../../shared/app/models/index.js';
import { ActiveTournament } from '../tournaments/ActiveTournament.js';
import logger from '../services/logger.js';
import { AppDataSource } from '../data-source.js';
import { createTournamentFromDTO } from '../../shared/app/models/Tournament.js';
import { getTournamentOrganizer } from '../tournaments/organizers/getTournamentOrganizer.js';
import HostedGameRepository from './HostedGameRepository.js';

@Service()
export default class TournamentRepository
{
    /**
     * Incoming and active tournaments, then archived.
     */
    private activeTournaments: { [tournamentPublicId: string]: ActiveTournament } = {};

    constructor(
        @Inject('Repository<Tournament>')
        private tournamentRepository: Repository<Tournament>,

        @Inject('Repository<TournamentSubscription>')
        private tournamentSubscriptionRepository: Repository<TournamentSubscription>,

        private hostedGameRepository: HostedGameRepository,
    ) {
        this.loadActiveTournaments();
    }

    private async loadActiveTournaments()
    {
        logger.info('Loading tournaments from database to memory...');

        await AppDataSource.initialize();

        const tournaments = await this.tournamentRepository.find({
            where: {
                state: In(['created', 'running']),
            },
            relations: {
                host: true,
                subscriptions: {
                    player: true,
                },
                participants: {
                    player: true,
                },
                games: {
                    player1: true,
                    player2: true,
                    hostedGame: true,
                },
            },
        });

        for (const tournament of tournaments) {
            this.activeTournaments[tournament.publicId] = new ActiveTournament(
                tournament,
                getTournamentOrganizer(tournament),
                this.createGame,
            );
        }

        logger.info('Loaded tournaments in memory', { tournamentsCount: tournaments.length });
    }

    private async createGame(gameOptions: HostedGameOptions, tournamentGame: TournamentGame): Promise<HostedGame>
    {
        if (!tournamentGame.player1 || !tournamentGame.player2) {
            throw new Error('Cannot create game, a player is missing');
        }

        const hostedGameServer = await this.hostedGameRepository.createGame(gameOptions);

        const result1 = hostedGameServer.playerJoin(tournamentGame.player1, true);
        const result2 = hostedGameServer.playerJoin(tournamentGame.player2, true);

        if (true !== result1 || true !== result2) {
            throw new Error(`Could not add player in game: "${result1}", "${result2}`);
        }

        await this.hostedGameRepository.persist(hostedGameServer.getHostedGame());

        return hostedGameServer.getHostedGame();
    }

    getActiveTournaments(): Tournament[]
    {
        return Object.values(this.activeTournaments).map(activeTournament => activeTournament.getTournament());
    }

    getActiveTournament(publicId: string): ActiveTournament
    {
        return this.activeTournaments[publicId] ?? null;
    }

    /**
     * Find tournament by slug, from memory or database.
     * Returns null if no tournament with this slug.
     */
    async findBySlugFull(slug: string): Promise<null | Tournament>
    {
        for (const publicId in this.activeTournaments) {
            if (this.activeTournaments[publicId].getTournament().slug === slug) {
                return this.activeTournaments[publicId].getTournament();
            }
        }

        return await this.tournamentRepository.findOne({
            where: { slug },
            relations: {
                host: true,
                subscriptions: {
                    player: true,
                },
                participants: {
                    player: true,
                },
                games: {
                    player1: true,
                    player2: true,
                    hostedGame: true,
                },
            },
        });
    }

    async findBySlug(slug: string): Promise<null | Tournament>
    {
        for (const publicId in this.activeTournaments) {
            if (this.activeTournaments[publicId].getTournament().slug === slug) {
                return this.activeTournaments[publicId].getTournament();
            }
        }

        return await this.tournamentRepository.findOne({
            where: { slug },
        });
    }

    async save(tournament: Tournament): Promise<Tournament>
    {
        return await this.tournamentRepository.save(tournament);
    }

    async createTournament(tournamentCreateDTO: TournamentCreateDTO, host: Player): Promise<Tournament>
    {
        let tournament = createTournamentFromDTO(tournamentCreateDTO);

        tournament.host = host;

        tournament = await this.save(tournament);

        this.activeTournaments[tournament.publicId] = new ActiveTournament(
            tournament,
            getTournamentOrganizer(tournament),
            this.createGame,
        );

        return tournament;
    }

    /**
     * Subscribe or check-in a player in a tournament
     */
    async subscribeCheckIn(tournament: Tournament, player: Player): Promise<TournamentSubscription>
    {
        if ('created' !== tournament.state) {
            throw new Error('Cannot subscribe or checkIn, tournament already started');
        }

        const now = new Date();
        let tournamentSubscription = tournament.subscriptions.find(subscription => subscription.player.publicId === player.publicId);

        if (undefined === tournamentSubscription) {
            tournamentSubscription = new TournamentSubscription();

            tournamentSubscription.player = player;
            tournamentSubscription.tournament = tournament;
            tournamentSubscription.subscribedAt = now;

            tournament.subscriptions.push(tournamentSubscription);
        }

        tournamentSubscription.checkedIn = now >= tournament.checkInAt
            ? now
            : null
        ;

        return await this.tournamentSubscriptionRepository.save(tournamentSubscription);
    }
}
