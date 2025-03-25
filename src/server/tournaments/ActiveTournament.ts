import { TypedEmitter } from 'tiny-typed-emitter';
import { HostedGameOptions, Tournament, TournamentGame, TournamentParticipant } from '../../shared/app/models/index.js';
import baseLogger from '../services/logger.js';
import { getStrictLoserPlayer, getStrictWinnerIndex, getStrictWinnerPlayer } from '../../shared/app/hostedGameUtils.js';
import { TournamentError } from './TournamentError.js';
import { TournamentEngineInterface } from './organizers/TournamentEngineInterface.js';
import { createGameOptionsForTournament, sortAndRankParticipants } from '../../shared/app/tournamentUtils.js';
import HostedGameServer from '../HostedGameServer.js';
import { addTournamentHistory } from '../../shared/app/models/TournamentHistory.js';
import { pseudoString } from '../../shared/app/pseudoUtils.js';

type TournamentEvents = {
    started: () => void;
    gameStarted: (tournamentGame: TournamentGame) => void;
    gameEnded: (tournamentGame: TournamentGame) => void;
    ended: () => void;
};

/**
 * A tournament that can be started, games can end and results reported...
 * This class manages a tournament with the library "tournament-organizer".
 */
export class ActiveTournament extends TypedEmitter<TournamentEvents>
{
    private logger: typeof baseLogger;

    private startTournamentTimeout: null | NodeJS.Timeout = null;

    constructor(
        private tournament: Tournament,
        private tournamentEngine: TournamentEngineInterface,
        private createGame: (gameOptions: HostedGameOptions, tournamentGame: TournamentGame) => Promise<HostedGameServer>,
    ) {
        super();

        this.logger = baseLogger.child({
            tournamentPublicId: tournament.publicId,
        });
    }

    /**
     * Called when this tournament is create, or loaded from memory.
     */
    async init(): Promise<void>
    {
        this.tournamentEngine.initTournamentEngine(this.tournament);

        if ('created' === this.tournament.state) {
            this.startOnDate();
        } else if ('running' === this.tournament.state) {
            // await this.iterateTournament();
        }
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
        await this.endPlayingGamesIfEnded();

        // Then create new games from updated bracket
        await this.createNextGames();

        this.endTournamentIfEnded();

        this.logger.debug('Workflow end');
    }

    private async endPlayingGamesIfEnded(): Promise<void>
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

        addTournamentHistory(this.tournament, 'ended', {}, this.tournament.endedAt);

        this.logger.info('Tournament has ended');

        this.emit('ended');
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

        try {
            this.tournamentEngine.start(this.tournament);
            this.tournament.state = 'running';
            this.tournament.startedAt = new Date();

            if (null !== this.startTournamentTimeout) {
                clearTimeout(this.startTournamentTimeout);
                this.startTournamentTimeout = null;
            }

            addTournamentHistory(this.tournament, 'started');

            this.emit('started');
        } catch (e) {
            if (e instanceof TournamentError) {
                this.tournament.participants = [];
                this.logger.error(e.message, e);
            }

            throw e;
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
        const matchNumber = `${tournamentGame.round}.${tournamentGame.number}`;

        this.logger.debug('Check if game has ended', {
            matchNumber,
            hostedGameState: tournamentGame.hostedGame?.state,
        });

        if (!hostedGame) {
            this.logger.error('No hostedGame for active tournamentGame', { matchNumber });
            return;
        }

        if ('playing' === hostedGame.state) {
            this.logger.debug('still playing, do nothing.', { matchNumber });
            return;
        }

        if ('created' === hostedGame.state) {
            this.logger.error('Unexpected tournament game state: "created"', { matchNumber, hostedGamePublicId: hostedGame.publicId });
            return;
        }

        if ('canceled' === hostedGame.state) {
            this.logger.info('game has been canceled, recreate', { matchNumber, hostedGamePublicId: hostedGame.publicId });
            addTournamentHistory(this.tournament, 'match_canceled_recreated', {
                round: tournamentGame.round,
                number: tournamentGame.number,
            });
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

        this.tournamentEngine.reportWinner(this.tournament, tournamentGame, winnerIndex);
        tournamentGame.state = 'done';
        let endedAt = hostedGame.gameData?.endedAt;

        if (!endedAt) {
            this.logger.warning('No game endedAt date for an ended tournament match. Assume match just ended now.', {
                round: tournamentGame.round,
                number: tournamentGame.number,
            });

            endedAt = new Date();
        }

        addTournamentHistory(this.tournament, 'match_ended', {
            hostedGamePublicId: hostedGame.publicId,
            round: tournamentGame.round,
            number: tournamentGame.number,
            winnerPseudo: pseudoString(getStrictWinnerPlayer(hostedGame)),
            loserPseudo: pseudoString(getStrictLoserPlayer(hostedGame)),
        }, endedAt);

        this.emit('gameEnded', tournamentGame);
    }

    private async doStartTournamentGame(tournamentGame: TournamentGame): Promise<void>
    {
        this.logger.debug('Create and start tournament game', { round: tournamentGame.round, number: tournamentGame.number });

        if (!tournamentGame.player1 || !tournamentGame.player2) {
            this.logger.error('startTournamentGame() called on tournamentGame, but still a player missing', { round: tournamentGame.round, number: tournamentGame.number });
            return;
        }

        tournamentGame.tournament = this.tournament;

        const hostedGameServer = await this.createGame(createGameOptionsForTournament(this.tournament), tournamentGame);

        tournamentGame.state = 'playing';
        tournamentGame.hostedGame = hostedGameServer.getHostedGame();

        this.listenHostedGameServer(tournamentGame, hostedGameServer);

        this.emit('gameStarted', tournamentGame);
    }

    private listenHostedGameServer(tournamentGame: TournamentGame, hostedGameServer: HostedGameServer): void
    {
        hostedGameServer.on('ended', async () => {
            this.doMarkGameAsEnded(tournamentGame);
            await this.createNextGames();
            this.endTournamentIfEnded();
        });

        hostedGameServer.on('canceled', async () => {
            this.logger.info('game has been canceled, recreate', { hostedGamePublicId: tournamentGame.hostedGame?.publicId });
            await this.doStartTournamentGame(tournamentGame);
        });
    }

    private updateRanking(): void
    {
        this.tournamentEngine.updateParticipantsScore(this.tournament);

        sortAndRankParticipants(this.tournament.participants);
    }
}
