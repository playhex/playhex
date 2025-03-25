import { Inject, Service } from 'typedi';
import { FindOptionsRelations, In, Repository } from 'typeorm';
import { HostedGameOptions, Player, Tournament, TournamentGame, TournamentSubscription } from '../../shared/app/models/index.js';
import { ActiveTournament } from '../tournaments/ActiveTournament.js';
import logger from '../services/logger.js';
import { AppDataSource } from '../data-source.js';
import { createTournamentFromCreateInput } from '../../shared/app/models/Tournament.js';
import { getTournamentEngine } from '../tournaments/organizers/getTournamentEngine.js';
import HostedGameRepository from './HostedGameRepository.js';
import HostedGameServer from '../HostedGameServer.js';
import { isCheckInOpen } from '../../shared/app/tournamentUtils.js';
import TournamentHistory from '../../shared/app/models/TournamentHistory.js';

const relations: FindOptionsRelations<Tournament> = {
    host: true,
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
    games: {
        player1: {
            currentRating: true,
        },
        player2: {
            currentRating: true,
        },
        hostedGame: {
            gameData: true,
            hostedGameToPlayers: {
                player: {
                    currentRating: true,
                },
            },
        },
    },
    history: true,
};

class TournamentException extends Error {}

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
            relations,
            where: {
                state: In(['created', 'running']),
            },
        });

        for (const tournament of tournaments) {
            this.activeTournaments[tournament.publicId] = this.createActiveTournament(tournament);
        }

        logger.info('Loaded tournaments in memory', { tournamentsCount: tournaments.length });
    }

    async persistAllTournaments(): Promise<boolean>
    {
        logger.info('Persisting all tournaments...');

        let allSuccess = true;

        for (const key in this.activeTournaments) {
            try {
                await this.save(this.activeTournaments[key].getTournament());
            } catch (e) {
                allSuccess = false;
                logger.error('Could not persist a tournament. Continue with others.', { tournamentPublicId: key, e, errorMessage: e.message });
            }
        }

        logger.info('Persisting done.');

        return allSuccess;
    }

    private createActiveTournament(tournament: Tournament): ActiveTournament
    {
        const activeTournament =  new ActiveTournament(
            tournament,
            getTournamentEngine(tournament),
            (gameOptions: HostedGameOptions, tournamentGame: TournamentGame) => this.createGame(gameOptions, tournamentGame),
        );

        activeTournament.on('started', () => this.save(tournament));
        activeTournament.on('gameEnded', () => this.save(tournament));
        activeTournament.on('ended', () => this.save(tournament));

        activeTournament.init();

        return activeTournament;
    }

    private async createGame(gameOptions: HostedGameOptions, tournamentGame: TournamentGame): Promise<HostedGameServer>
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

        return hostedGameServer;
    }

    getActiveTournaments(): Tournament[]
    {
        return Object.values(this.activeTournaments).map(activeTournament => activeTournament.getTournament());
    }

    getActiveTournament(publicId: string): null | ActiveTournament
    {
        return this.activeTournaments[publicId] ?? null;
    }

    async getEndedTournaments(): Promise<Tournament[]>
    {
        return await this.tournamentRepository.find({
            relations: {
                host: true,
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
            relations,
            where: { slug },
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
        logger.info('Persist tournament...', { publicId: tournament.publicId });

        return await this.tournamentRepository.save(tournament);
    }

    async createTournament(tournament: Tournament, host: Player): Promise<Tournament>
    {
        tournament = createTournamentFromCreateInput(tournament);

        tournament.host = host;

        const history = new TournamentHistory();

        history.date = tournament.createdAt;
        history.tournament = tournament;
        history.type = 'created';
        history.parameters = {
            hostPseudo: host.pseudo,
            hostPublicId: host.publicId,
        };

        tournament.history.push(history);

        tournament = await this.save(tournament);

        this.activeTournaments[tournament.publicId] = this.createActiveTournament(tournament);

        return tournament;
    }

    /**
     *
     * @param tournament
     * @param edited
     * @throws {TournamentException} If tournament has already started, or has ended.
     */
    async editTournament(tournament: Tournament, edited: Tournament): Promise<Tournament>
    {
        if ('created' !== tournament.state) {
            throw new TournamentException('Cannot edit, tournament has already started');
        }

        tournament.title = edited.title;
        tournament.startsAt = edited.startsAt;

        tournament = await this.save(tournament);

        return tournament;
    }

    /**
     * Subscribe and/or check-in a player in a tournament.
     * Check-in is effective only when in check-in period.
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

        tournamentSubscription.checkedIn = isCheckInOpen(tournament, now)
            ? now
            : null
        ;

        return await this.tournamentSubscriptionRepository.save(tournamentSubscription);
    }
}
