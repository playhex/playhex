import { Inject, Service } from 'typedi';
import { In, Repository } from 'typeorm';
import { HostedGameOptions, Tournament, TournamentGame } from '../../shared/app/models/index.js';
import { ActiveTournament } from '../ActiveTournament.js';
import logger from '../services/logger.js';
import HostedGameRepository from './HostedGameRepository.js';
import { getStrictWinnerIndex } from '../../shared/app/hostedGameUtils.js';
import { AppDataSource } from '../data-source.js';

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
            this.activeTournaments[tournament.publicId] = new ActiveTournament(tournament);
        }

        logger.info('Loaded tournaments in memory', { tournamentsCount: tournaments.length });
    }

    async getActiveTournaments(): Promise<null | Tournament[]>
    {
        return Object.values(this.activeTournaments).map(activeTournament => activeTournament.getTournament());
    }

    /**
     * Find tournament by slug, from memory or database.
     * Returns null if no tournament with this slug.
     */
    async findBySlug(slug: string): Promise<null | Tournament>
    {
        for (const publicId in this.activeTournaments) {
            if (this.activeTournaments[publicId].getTournament().slug === slug) {
                return this.activeTournaments[publicId].getTournament();
            }
        }

        return await this.tournamentRepository.findOne({
            where: { slug },
            relations: {
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

    async save(tournament: Tournament): Promise<Tournament>
    {
        return this.tournamentRepository.save(tournament);
    }

    async iterateTournament(tournament: Tournament): Promise<void>
    {
        logger.debug('Workflow begin');

        const now = new Date();

        if ('ended' === tournament.state) {
            logger.debug('Ended, do nothing');
            return;
        }

        const activeTournament = this.activeTournaments[tournament.publicId];

        if (!activeTournament) {
            throw new Error(`Tournament ${tournament.publicId} not loaded in memory`);
        }

        tournament = activeTournament.getTournament();

        if ('created' === tournament.state) {
            if (now < tournament.startsAt) {
                logger.debug('Tournament not yet started, do nothing');
                return;
            }

            logger.info('Tournament start date is past, start it');

            tournament.state = 'running';
            activeTournament.started();
        }

        logger.debug('Tournament is playing');

        logger.debug('Add/update tournament games');

        activeTournament.updateTournamentGames();

        logger.debug('Progress tournament games');

        for (const tournamentGame of tournament.games) {
            const { state } = tournamentGame;

            if ('waiting' === state) {
                await this.checkWaitingGameCanStart(activeTournament.getTournament(), tournamentGame);
                continue;
            }

            if ('playing' === state) {
                await this.checkPlayingGameHasEnded(activeTournament, tournamentGame);
                continue;
            }

            if ('done' === state) {
                continue;
            }

            logger.warning('Unexpected tournamentGame.state, do nothing', { state, tournamentGame });
        }

        this.updateRanking(activeTournament);

        logger.debug('Check whether tournament has ended');

        if (activeTournament.isFinished()) {
            tournament.state = 'ended';

            logger.debug('Tournament has ended');
        }

        logger.debug('Workflow end');
    }

    private async checkWaitingGameCanStart(tournament: Tournament, tournamentGame: TournamentGame): Promise<void>
    {
        logger.debug('Check if waiting game can start', { round: tournamentGame.round, number: tournamentGame.number });

        if (!tournamentGame.player1 || !tournamentGame.player2) {
            logger.debug('Still a missing player, waiting again');
            return;
        }

        await this.doStartTournamentGame(tournament, tournamentGame);

        logger.info('Started a tournament game', {
            round: tournamentGame.round,
            number: tournamentGame.number,
            player1: tournamentGame.player1.pseudo,
            player2: tournamentGame.player2.pseudo,
        });
    }

    private async checkPlayingGameHasEnded(activeTournament: ActiveTournament, tournamentGame: TournamentGame): Promise<void>
    {
        logger.debug('Check if game has ended', { hostedGame: tournamentGame.hostedGame });

        if (!tournamentGame.hostedGame) {
            logger.error('No hostedGame for active tournamentGame', { round: tournamentGame.round, number: tournamentGame.number });
            return;
        }

        const hostedGame = await this.hostedGameRepository.getActiveOrArchivedGame(tournamentGame.hostedGame.publicId);

        if (null === hostedGame) {
            logger.error('Unexpected null tournament hosted game', { hostedGamePublicId: tournamentGame.hostedGame.publicId });
            return;
        }

        if ('playing' === hostedGame.state) {
            logger.debug('still playing, do nothing.');
            return;
        }

        if ('created' === hostedGame.state) {
            logger.error('Unexpected tournament game state: "created"', { hostedGamePublicId: tournamentGame.hostedGame.publicId });
            return;
        }

        if ('canceled' === hostedGame.state) {
            logger.info('game has been canceled, recreate');
            await this.doStartTournamentGame(activeTournament.getTournament(), tournamentGame);
            return;
        }

        if ('ended' !== hostedGame.state) {
            logger.error('Unexpected state', { hostedGamePublicId: tournamentGame.hostedGame.publicId, state: hostedGame.state });
            return;
        }

        const winnerIndex = getStrictWinnerIndex(hostedGame);

        logger.info('Tournament game has ended, report winner', { winnerIndex });

        activeTournament.reportWinner(tournamentGame, winnerIndex);
        tournamentGame.state = 'done';
    }

    private async doStartTournamentGame(tournament: Tournament, tournamentGame: TournamentGame): Promise<void>
    {
        logger.debug('Create and start tournament game', { round: tournamentGame.round, number: tournamentGame.number });

        if (!tournamentGame.player1 || !tournamentGame.player2) {
            logger.error('startTournamentGame() called on tournamentGame, but still a player missing', { round: tournamentGame.round, number: tournamentGame.number });
            return;
        }

        const gameOptions = new HostedGameOptions();

        gameOptions.boardsize = tournament.boardsize;
        gameOptions.timeControl = tournament.timeControl;
        gameOptions.ranked = tournament.ranked;

        const hostedGameServer = await this.hostedGameRepository.createGame(gameOptions);

        const result1 = hostedGameServer.playerJoin(tournamentGame.player1, true);
        const result2 = hostedGameServer.playerJoin(tournamentGame.player2, true);

        if (true !== result1 || true !== result2) {
            logger.error('Could not add player in game', {
                result1,
                result2,
            });
        }

        tournamentGame.state = 'playing';
        tournamentGame.hostedGame = hostedGameServer.getHostedGame() ?? undefined;
    }

    private updateRanking(activeTournament: ActiveTournament): void
    {
        activeTournament.updateParticipantsScore();

        const tournament = activeTournament.getTournament();

        tournament.participants.sort((a, b) => {
            let scoreA = a.score ?? 0;
            let scoreB = b.score ?? 0;

            if (scoreA === scoreB) {
                scoreA += a.tiebreak ?? 0;
                scoreB += b.tiebreak ?? 0;
            }

            return scoreB - scoreA;
        });

        for (let i = 0; i < tournament.participants.length; ++i) {
            tournament.participants[i].rank = i + 1;
        }
    }
}
