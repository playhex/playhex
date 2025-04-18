import { HostedGameOptions, Tournament, TournamentGame, TournamentParticipant } from '../../shared/app/models/index.js';
import baseLogger from '../services/logger.js';
import { getStrictWinnerIndex } from '../../shared/app/hostedGameUtils.js';
import { TournamentError } from './TournamentError.js';
import { TournamentEngineInterface } from './organizers/TournamentEngineInterface.js';
import { createGameOptionsForTournament, sortAndRankParticipants } from '../../shared/app/tournamentUtils.js';
import HostedGameServer from '../HostedGameServer.js';

/**
 * A tournament that can be started, games can end and results reported...
 * This class manages a tournament with the library "tournament-organizer".
 */
export class ActiveTournament
{
    private logger: typeof baseLogger;

    private startTournamentTimeout: null | NodeJS.Timeout = null;

    constructor(
        private tournament: Tournament,
        private tournamentEngine: TournamentEngineInterface,
        private createGame: (gameOptions: HostedGameOptions, tournamentGame: TournamentGame) => Promise<HostedGameServer>,
    ) {
        this.logger = baseLogger.child({
            tournamentPublicId: tournament.publicId,
        });

        tournamentEngine.initTournamentEngine(tournament);

        this.startOnDate();
    }

    /**
     * Starts tournament if start date past,
     * or set a timeout to start it at the start date.
     */
    private startOnDate(): void
    {
        if (null !== this.startTournamentTimeout) {
            clearTimeout(this.startTournamentTimeout);
            this.startTournamentTimeout = null;
        }

        if ('created' !== this.tournament.state) {
            return;
        }

        const startsInMs = this.tournament.startsAt.getTime() - new Date().getTime();

        // Tournament date past, start now
        if (startsInMs <= 0) {
            this.iterateTournament();
            return;
        }

        this.startTournamentTimeout = setTimeout(
            () => this.startOnDate(),
            Math.min(startsInMs, 86400000 * 7), // Prevent setting a large number. Instead, retry later
        );
    }

    getTournament(): Tournament
    {
        return this.tournament;
    }

    /**
     * Run tournament workflow:
     * start it can be started,
     * start games, progress...
     */
    async iterateTournament(): Promise<void>
    {
        this.logger.debug('Workflow begin');

        if ('ended' === this.tournament.state) {
            this.logger.debug('Ended, do nothing');
            return;
        }

        if ('created' === this.tournament.state) {
            if (new Date() < this.tournament.startsAt) {
                this.logger.debug('Tournament not yet started, do nothing');
                return;
            }

            this.logger.info('Tournament start date is past, start it');

            try {
                await this.doStartTournament();
            } catch (e) {
                if (e instanceof TournamentError) {
                    this.logger.error('Could not start tournament', { reason: e.message });
                    return;
                }

                throw e;
            }
        }

        this.logger.debug('Tournament is playing, progress tournament games');

        // First mark games as ended
        await this.endGamesIfEnded();

        // Then create new games from updated bracket
        await this.createNextGames();

        this.endTournamentIfEnded();

        this.logger.debug('Workflow end');
    }

    private async endGamesIfEnded(): Promise<void>
    {
        this.logger.debug('Check if playing games have ended');

        // Check playing games has ended
        for (const tournamentGame of this.tournament.games) {
            if ('playing' === tournamentGame.state) {
                await this.checkPlayingGameHasEnded(tournamentGame);
            }
        }

        // Check that we have not missed to report winner to tournament engine
        for (const tournamentGame of this.tournamentEngine.getActiveGames(this.tournament)) {
            if ('done' === tournamentGame.state) {
                this.logger.warning('A game was done, but still active in tournament engine. Reporting winner.', {
                    tournamentGameId: tournamentGame.id,
                    hostedGamePublicId: tournamentGame.hostedGame?.publicId,
                    engineGameId: tournamentGame.engineGameId,
                    round: tournamentGame.round,
                    number: tournamentGame.number,
                });

                this.doMarkGameAsEnded(tournamentGame);
            }
        }
    }

    /**
     * Get next games from tournament engine bracket,
     * and start games if needed.
     */
    private async createNextGames(): Promise<void>
    {
        this.logger.debug('Add/update tournament games');

        this.tournamentEngine.updateTournamentGames(this.tournament);

        this.logger.debug('Check if created games can be started');

        for (const tournamentGame of this.tournament.games) {
            if ('waiting' === tournamentGame.state) {
                await this.checkWaitingGameCanStart(tournamentGame);
            }
        }

        this.logger.debug('Update scores and rankings');

        this.updateRanking();
    }

    private endTournamentIfEnded(): void
    {
        this.logger.debug('Check whether tournament has ended');

        if (!this.tournamentEngine.isFinished(this.tournament)) {
            this.logger.debug('Tournament has not yet ended');
            return;
        }

        this.tournament.state = 'ended';
        this.tournament.endedAt = new Date();

        this.logger.info('Tournament has ended');
    }

    private async doStartTournament(): Promise<void>
    {
        const checkedInSubscriptions = this.tournament.subscriptions.filter(subscription => subscription.checkedIn);

        this.tournament.participants = [];

        for (const subscription of checkedInSubscriptions) {
            const participant = new TournamentParticipant();

            participant.tournament = this.tournament;
            participant.player = subscription.player;

            this.tournament.participants.push(participant);
        }

        this.tournamentEngine.start(this.tournament);
        this.tournament.state = 'running';

        if (null !== this.startTournamentTimeout) {
            clearTimeout(this.startTournamentTimeout);
            this.startTournamentTimeout = null;
        }
    }

    /**
     * If game is waiting and both participants are known,
     * start the game.
     */
    private async checkWaitingGameCanStart(tournamentGame: TournamentGame): Promise<void>
    {
        this.logger.debug('Check if waiting game can start', { round: tournamentGame.round, number: tournamentGame.number });

        if (!tournamentGame.player1 || !tournamentGame.player2) {
            this.logger.debug('Still a missing player, waiting again');
            return;
        }

        await this.doStartTournamentGame(tournamentGame);

        this.logger.info('Started a tournament game', {
            round: tournamentGame.round,
            number: tournamentGame.number,
            player1: tournamentGame.player1.pseudo,
            player2: tournamentGame.player2.pseudo,
        });
    }

    /**
     * If game was playing and is now over,
     * mark tournament game as finished and report winner to tournament engine.
     */
    private async checkPlayingGameHasEnded(tournamentGame: TournamentGame): Promise<void>
    {
        const { hostedGame } = tournamentGame;

        this.logger.debug('Check if game has ended', { hostedGame });

        if (!hostedGame) {
            this.logger.error('No hostedGame for active tournamentGame', { round: tournamentGame.round, number: tournamentGame.number });
            return;
        }

        if ('playing' === hostedGame.state) {
            this.logger.debug('still playing, do nothing.');
            return;
        }

        if ('created' === hostedGame.state) {
            this.logger.error('Unexpected tournament game state: "created"', { hostedGamePublicId: hostedGame.publicId });
            return;
        }

        if ('canceled' === hostedGame.state) {
            this.logger.info('game has been canceled, recreate');
            await this.doStartTournamentGame(tournamentGame);
            return;
        }

        if ('ended' !== hostedGame.state) {
            this.logger.error('Unexpected state', { hostedGamePublicId: hostedGame.publicId, state: hostedGame.state });
            return;
        }

        this.doMarkGameAsEnded(tournamentGame);
    }

    private doMarkGameAsEnded(tournamentGame: TournamentGame): void
    {
        const { hostedGame } = tournamentGame;

        if (!hostedGame) {
            this.logger.error('No hostedGame for active tournamentGame', { round: tournamentGame.round, number: tournamentGame.number });
            return;
        }

        if ('ended' !== hostedGame.state) {
            this.logger.error('doMarkGameAsEnded must be used on "ended" game', { hostedGamePublicId: hostedGame.publicId, state: hostedGame.state });
            return;
        }

        const winnerIndex = getStrictWinnerIndex(hostedGame);

        this.logger.info('Tournament game has ended, report winner', { winnerIndex });

        this.tournamentEngine.reportWinner(this.tournament,tournamentGame, winnerIndex);
        tournamentGame.state = 'done';
    }

    private async doStartTournamentGame(tournamentGame: TournamentGame): Promise<void>
    {
        this.logger.debug('Create and start tournament game', { round: tournamentGame.round, number: tournamentGame.number });

        if (!tournamentGame.player1 || !tournamentGame.player2) {
            this.logger.error('startTournamentGame() called on tournamentGame, but still a player missing', { round: tournamentGame.round, number: tournamentGame.number });
            return;
        }

        const hostedGameServer = await this.createGame(createGameOptionsForTournament(this.tournament), tournamentGame);

        tournamentGame.state = 'playing';
        tournamentGame.hostedGame = hostedGameServer.getHostedGame();

        this.listenHostedGameServer(tournamentGame, hostedGameServer);
    }

    private listenHostedGameServer(tournamentGame: TournamentGame, hostedGameServer: HostedGameServer): void
    {
        hostedGameServer.on('ended', async () => {
            this.doMarkGameAsEnded(tournamentGame);
            await this.createNextGames();
            this.endTournamentIfEnded();
        });

        hostedGameServer.on('canceled', async () => {
            this.logger.info('game has been canceled, recreate');
            await this.doStartTournamentGame(tournamentGame);
        });
    }

    private updateRanking(): void
    {
        this.tournamentEngine.updateParticipantsScore(this.tournament);

        sortAndRankParticipants(this.tournament);
    }
}
