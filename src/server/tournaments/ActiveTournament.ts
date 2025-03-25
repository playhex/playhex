import { HostedGame, HostedGameOptions, Tournament, TournamentGame, TournamentParticipant } from '../../shared/app/models/index.js';
import baseLogger from '../services/logger.js';
import { getStrictWinnerIndex } from '../../shared/app/hostedGameUtils.js';
import { TournamentError } from './TournamentError.js';
import { TournamentOrganizerInterface } from './organizers/TournamentOrganizerInterface.js';

/**
 * A tournament that can be started, games can end and results reported...
 * This class manages a tournament with the library "tournament-organizer".
 */
export class ActiveTournament
{
    private logger: typeof baseLogger;

    constructor(
        private tournament: Tournament,
        private tournamentOrganizer: TournamentOrganizerInterface,
        private createGame: (gameOptions: HostedGameOptions, tournamentGame: TournamentGame) => Promise<HostedGame>,
    ) {
        this.logger = baseLogger.child({
            tournamentPublicId: tournament.publicId,
        });

        tournamentOrganizer.initTournamentEngine(tournament);
    }

    getTournament(): Tournament
    {
        return this.tournament;
    }

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

        this.logger.debug('Tournament is playing');

        this.logger.debug('Add/update tournament games');

        this.tournamentOrganizer.updateTournamentGames(this.tournament);

        this.logger.debug('Progress tournament games');

        for (const tournamentGame of this.tournament.games) {
            const { state } = tournamentGame;

            if ('waiting' === state) {
                await this.checkWaitingGameCanStart(tournamentGame);
                continue;
            }

            if ('playing' === state) {
                await this.checkPlayingGameHasEnded(tournamentGame);
                continue;
            }

            if ('done' === state) {
                continue;
            }

            this.logger.warning('Unexpected tournamentGame.state, do nothing', { state, tournamentGame });
        }

        this.updateRanking();

        this.logger.debug('Check whether tournament has ended');

        if (this.tournamentOrganizer.isFinished(this.tournament)) {
            this.tournament.state = 'ended';
            // TODO add endedAt date, and unit test for it

            this.logger.debug('Tournament has ended');
        }

        this.logger.debug('Workflow end');
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

        this.tournamentOrganizer.start(this.tournament);
        this.tournament.state = 'running';
    }

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

    private async checkPlayingGameHasEnded(tournamentGame: TournamentGame): Promise<void>
    {
        this.logger.debug('Check if game has ended', { hostedGame: tournamentGame.hostedGame });

        if (!tournamentGame.hostedGame) {
            this.logger.error('No hostedGame for active tournamentGame', { round: tournamentGame.round, number: tournamentGame.number });
            return;
        }

        const { hostedGame } = tournamentGame;

        if (null === hostedGame) {
            this.logger.error('Unexpected null tournament hosted game', { hostedGamePublicId: tournamentGame.hostedGame.publicId });
            return;
        }

        if ('playing' === hostedGame.state) {
            this.logger.debug('still playing, do nothing.');
            return;
        }

        if ('created' === hostedGame.state) {
            this.logger.error('Unexpected tournament game state: "created"', { hostedGamePublicId: tournamentGame.hostedGame.publicId });
            return;
        }

        if ('canceled' === hostedGame.state) {
            this.logger.info('game has been canceled, recreate');
            await this.doStartTournamentGame(tournamentGame);
            return;
        }

        if ('ended' !== hostedGame.state) {
            this.logger.error('Unexpected state', { hostedGamePublicId: tournamentGame.hostedGame.publicId, state: hostedGame.state });
            return;
        }

        const winnerIndex = getStrictWinnerIndex(hostedGame);

        this.logger.info('Tournament game has ended, report winner', { winnerIndex });

        this.tournamentOrganizer.reportWinner(this.tournament,tournamentGame, winnerIndex);
        tournamentGame.state = 'done';
    }

    private async doStartTournamentGame(tournamentGame: TournamentGame): Promise<void>
    {
        this.logger.debug('Create and start tournament game', { round: tournamentGame.round, number: tournamentGame.number });

        if (!tournamentGame.player1 || !tournamentGame.player2) {
            this.logger.error('startTournamentGame() called on tournamentGame, but still a player missing', { round: tournamentGame.round, number: tournamentGame.number });
            return;
        }

        const hostedGame = await this.createGame(this.createGameOptions(), tournamentGame);

        tournamentGame.state = 'playing';
        tournamentGame.hostedGame = hostedGame;
    }

    private createGameOptions(): HostedGameOptions
    {
        const gameOptions = new HostedGameOptions();

        gameOptions.boardsize = this.tournament.boardsize;
        gameOptions.timeControl = this.tournament.timeControl;
        gameOptions.ranked = this.tournament.ranked;

        return gameOptions;
    }

    private updateRanking(): void
    {
        this.tournamentOrganizer.updateParticipantsScore(this.tournament);

        this.tournament.participants.sort((a, b) => {
            let scoreA = a.score ?? 0;
            let scoreB = b.score ?? 0;

            if (scoreA === scoreB) {
                scoreA += a.tiebreak ?? 0;
                scoreB += b.tiebreak ?? 0;
            }

            return scoreB - scoreA;
        });

        for (let i = 0; i < this.tournament.participants.length; ++i) {
            this.tournament.participants[i].rank = i + 1;
        }
    }
}
