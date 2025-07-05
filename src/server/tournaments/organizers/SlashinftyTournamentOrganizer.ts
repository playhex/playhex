import TournamentOrganizer from 'tournament-organizer';
import { StandingsValues } from 'tournament-organizer/interfaces';
import { Tournament as TOTournament, Player as TOPlayer, Match } from 'tournament-organizer/components';
import { findTournamentGameByRoundAndNumber, getDoubleEliminationFinalRound, getLastRound, tournamentMatchNumber } from '../../../shared/app/tournamentUtils.js';
import { TournamentEngineInterface } from './TournamentEngineInterface.js';
import { CannotStartTournamentGameError, NotEnoughParticipantsToStartTournamentError, TooDeepResetError, TournamentEngineError } from '../TournamentError.js';
import { Service } from 'typedi';
import { Tournament, TournamentGame, Player } from '../../../shared/app/models/index.js';
import { PlayerIndex } from '../../../shared/game-engine/Types.js';
import { timeControlToCadencyName } from '../../../shared/app/timeControlUtils.js';

const tournamentOrganizer = new TournamentOrganizer();

const toTournaments: { [publicId: string]: TOTournament } = {};

@Service()
export class SlashinftyTournamentOrganizer implements TournamentEngineInterface
{
    supports(tournament: Tournament): boolean
    {
        return [
            'single-elimination',
            'double-elimination',
            'swiss',
            'double-round-robin',
        ].includes(tournament.stage1Format)
            && null === tournament.stage2Format
        ;
    }

    private createToTournament(tournament: Tournament): TOTournament
    {
        const toTournament = tournamentOrganizer.createTournament(tournament.title, {
            stageOne: {
                format: tournament.stage1Format ?? undefined,
                rounds: tournament.stage1Rounds ?? undefined,
                consolation: tournament.consolation ?? undefined,
            },
            stageTwo: tournament.stage2Format ? {
                format: tournament.stage2Format ?? undefined,
                consolation: tournament.consolation ?? undefined,
            } : undefined,
            players: tournament.participants.map(participant => {
                return new TOPlayer(participant.player.publicId, participant.player.pseudo);
            }),
        }, tournament.publicId);

        toTournaments[tournament.publicId] = toTournament;

        return toTournament;
    }

    private reloadToTournament(tournament: Tournament): TOTournament
    {
        if (!tournament.engineData) {
            throw new Error('Tried to reload tournament but no tournament engine data');
        }

        const toTournament = tournamentOrganizer.reloadTournament(tournament.engineData);

        toTournaments[tournament.publicId] = toTournament;

        return toTournament;
    }

    private getTournament(tournament: Tournament): TOTournament
    {
        const toTournament = toTournaments[tournament.publicId];

        if (undefined === toTournament) {
            throw new Error(`No loaded toTournament for tournament "${tournament.publicId}".`);
        }

        return toTournament;
    }

    private findMatchById(toTournament: TOTournament, matchId: string): null | Match
    {
        return toTournament.matches.find(match => match.id === matchId) ?? null;
    }

    private findMatchByRoundAndNumber(toTournament: TOTournament, round: number, number: number): null | Match
    {
        return toTournament.matches.find(match => match.round === round && match.match === number) ?? null;
    }

    initTournamentEngine(tournament: Tournament)
    {
        if ('running' === tournament.state) {
            this.reloadToTournament(tournament);
        }
    }

    start(tournament: Tournament): void
    {
        const toTournament = this.createToTournament(tournament);

        try {
            toTournament.start();
        } catch (e) {
            const error = 'string' === typeof e
                ? new TournamentEngineError(e)
                : new TournamentEngineError(e.message)
            ;

            if (error.message.includes('Insufficient number of players')) {
                throw new NotEnoughParticipantsToStartTournamentError(error.message);
            }

            throw error;
        }

        tournament.engineData = toTournament;
    }

    /**
     * Create a list of TournamentGame indexed by "round.number"
     * to allow fast retrieve from a given TournamentGame round and number
     */
    private getTournamentGamesByRoundAndNumber(tournament: Tournament): { [roundAndNumber: string]: TournamentGame }
    {
        const tournamentGames: { [roundAndNumber: string]: TournamentGame } = {};

        for (const tournamentGame of tournament.games) {
            tournamentGames[tournamentMatchNumber(tournamentGame)] = tournamentGame;
        }

        return tournamentGames;
    }

    private getMatchesById(toTournament: TOTournament): { [matchId: string]: Match }
    {
        const matches: { [matchId: string]: Match } = {};

        for (const match of toTournament.matches) {
            matches[match.id] = match;
        }

        return matches;
    }

    updateTournamentGames(tournament: Tournament): void
    {
        const toTournament = this.getTournament(tournament);

        this.nextRoundOrEndTournament(tournament);

        const tournamentGames = this.getTournamentGamesByRoundAndNumber(tournament);

        // Create new tournamentGames for new matches
        for (const match of toTournament.matches) {
            const roundAndNumber = `${match.round}.${match.match}`;
            let tournamentGame = tournamentGames[roundAndNumber];

            if (!tournamentGame) {
                tournamentGame = this.doCreateTournamentGame(tournament, match);
                tournamentGames[roundAndNumber] = tournamentGame;
            } else if ('waiting' === tournamentGame.state) {
                this.doUpdateTournamentGame(tournament, tournamentGame, match);
            }
        }

        const matches = this.getMatchesById(toTournament);

        // Create winner and loser paths
        for (const match of toTournament.matches) {
            const roundAndNumber = `${match.round}.${match.match}`;
            const tournamentGame = tournamentGames[roundAndNumber];
            const { win, loss } = match.path;

            if (win) {
                const winMatch = matches[win];
                tournamentGame.winnerPath = `${winMatch.round}.${winMatch.match}`;
            } else {
                tournamentGame.winnerPath = null;
            }

            if (loss) {
                const lossMatch = matches[loss];
                tournamentGame.loserPath = `${lossMatch.round}.${lossMatch.match}`;
            } else {
                tournamentGame.loserPath = null;
            }
        }

        this.updateTournamentGameLabels(tournament);

        tournament.engineData = toTournament;
    }

    checkBeforeStart(tournament: Tournament, tournamentGame: TournamentGame): void
    {
        if ('waiting' !== tournamentGame.state) {
            throw new Error('checkBeforeStart() called with a non-waiting game');
        }

        if (null === tournamentGame.player1) {
            throw new CannotStartTournamentGameError('Player1 not yet known');
        }

        if (null === tournamentGame.player2) {
            throw new CannotStartTournamentGameError('Player2 not yet known');
        }

        this.checkBeforeStartRoundRobinLiveTournamentGame(tournament, tournamentGame);
    }

    /**
     * For round robin, live tournament, we should not start all games at once.
     * Instead we will start a game only if both players are not playing in another game of this tournament.
     *
     * This method throws if we are in a round robin
     * and we check if we can start a game where one player is already on another tournament game.
     */
    private checkBeforeStartRoundRobinLiveTournamentGame(tournament: Tournament, tournamentGame: TournamentGame): void
    {
        if (!tournamentGame.player1 || !tournamentGame.player2) {
            return;
        }

        // Ignore correspondence tournaments
        if ('correspondence' === timeControlToCadencyName(tournament)) {
            return;
        }

        const toTournament = this.getTournament(tournament);

        // Ignore when tournament is not round robin
        if ('stage-one' !== toTournament.status || 'round-robin' !== tournament.stage1Format) {
            return;
        }

        for (const { state, player1, player2 } of tournament.games) {
            if ('playing' !== state || !player1 || !player2) {
                continue;
            }

            if (tournamentGame.player1.publicId === player1.publicId || tournamentGame.player1.publicId === player2.publicId) {
                throw new CannotStartTournamentGameError('Player1 is already playing, cannot start round robin live tournament game');
            }

            if (tournamentGame.player2.publicId === player1.publicId || tournamentGame.player2.publicId === player2.publicId) {
                throw new CannotStartTournamentGameError('Player2 is already playing, cannot start round robin live tournament game');
            }
        }
    }

    private nextRoundOrEndTournament(tournament: Tournament): void
    {
        const toTournament = this.getTournament(tournament);

        if (0 === toTournament.matches.length) {
            return;
        }

        if (toTournament.matches.every(match => !match.active)) {
            try {
                toTournament.next();
            } catch (e) {
                toTournament.end();
            }
        }

        tournament.engineData = toTournament;
    }

    private doUpdateTournamentGame(tournament: Tournament, tournamentGame: TournamentGame, match: Match): void
    {
        if (!tournamentGame.player1 && match.player1.id) {
            tournamentGame.player1 = this.getParticipant(tournament, match.player1.id);
        }

        if (!tournamentGame.player2 && match.player2.id) {
            tournamentGame.player2 = this.getParticipant(tournament, match.player2.id);
        }
    }

    private doCreateTournamentGame(tournament: Tournament, match: Match): TournamentGame
    {
        const tournamentGame = new TournamentGame();

        tournamentGame.tournament = tournament;
        tournamentGame.state = match.bye ? 'done' : 'waiting';
        tournamentGame.round = match.round;
        tournamentGame.number = match.match;
        tournamentGame.bye = match.bye;

        if (match.player1.id) {
            tournamentGame.player1 = this.getParticipant(tournament, match.player1.id);
        }

        if (match.player2.id) {
            tournamentGame.player2 = this.getParticipant(tournament, match.player2.id);
        }

        tournament.games.push(tournamentGame);

        return tournamentGame;
    }

    private updateTournamentGameLabels(tournament: Tournament): void
    {
        if ('single-elimination' === tournament.stage1Format) {
            const lastRound = getLastRound(tournament);

            for (const tournamentGame of tournament.games) {
                if (tournamentGame.round === lastRound) {
                    tournamentGame.label = 'final';
                }

                if (tournamentGame.round === lastRound - 1) {
                    tournamentGame.label = 'semi_final';
                }
            }
        }

        if ('double-elimination' === tournament.stage1Format) {
            const finalRound = getDoubleEliminationFinalRound(tournament);

            for (const tournamentGame of tournament.games) {
                if (tournamentGame.round === finalRound) {
                    tournamentGame.label = 'final';
                }

                if (tournamentGame.round === finalRound - 1) {
                    tournamentGame.label = 'semi_final';
                }
            }

            const lastRound = getLastRound(tournament);

            if (lastRound > finalRound) {
                for (const tournamentGame of tournament.games) {
                    if (tournamentGame.round === lastRound) {
                        tournamentGame.label = 'loser_final';
                    }
                }
            }
        }
    }

    private getParticipant(tournament: Tournament, publicId: string): Player
    {
        for (const participant of tournament.participants) {
            if (participant.player.publicId === publicId) {
                return participant.player;
            }
        }

        throw new Error(`Player with public id "${publicId}" not in tournament participants`);
    }

    getActiveGames(tournament: Tournament): TournamentGame[]
    {
        const toTournament = this.getTournament(tournament);
        const tournamentGames: TournamentGame[] = [];
        const tournamentGamesIndexed = this.getTournamentGamesByRoundAndNumber(tournament);

        for (const match of toTournament.matches) {
            if (match.active) {
                const tournamentGame = tournamentGamesIndexed[`${match.round}.${match.match}`];

                if (tournamentGame) {
                    tournamentGames.push(tournamentGame);
                }
            }
        }

        return tournamentGames;
    }

    reportWinner(tournament: Tournament, tournamentGame: TournamentGame, winnerIndex: PlayerIndex): void
    {
        const toTournament = this.getTournament(tournament);
        const match = this.findMatchByRoundAndNumber(toTournament, tournamentGame.round, tournamentGame.number);

        if (!match) {
            throw new Error(`No match found for tournamentGame ${tournamentMatchNumber(tournamentGame)}`);
        }

        // winner already reported
        if (!match.active) {
            return;
        }

        toTournament.enterResult(
            match.id,
            0 === winnerIndex ? 1 : 0,
            1 === winnerIndex ? 1 : 0,
        );

        this.nextRoundOrEndTournament(tournament);

        tournament.engineData = toTournament;
    }

    updateParticipantsScore(tournament: Tournament): void
    {
        const toTournament = this.getTournament(tournament);

        const standings = toTournament.standings(false);
        const playerStanding: { [playerPublicId: string]: StandingsValues } = {};

        for (const standing of standings) {
            playerStanding[standing.player.id] = standing;
        }

        for (const participant of tournament.participants) {
            participant.score = playerStanding[participant.player.publicId].matchPoints;
            participant.tiebreak = playerStanding[participant.player.publicId].tiebreaks.medianBuchholz;
        }
    }

    isFinished(tournament: Tournament): boolean
    {
        const toTournament = this.getTournament(tournament);

        return 'complete' === toTournament.status;
    }

    private isMatchDone(match: Match): boolean
    {
        if (match.active) {
            return false;
        }

        const { player1, player2 } = match;

        if (player1.win || player1.loss || player1.draw) {
            return true;
        }

        if (player2.win || player2.loss || player2.draw) {
            return true;
        }

        return false;
    }

    private isMatchDoneById(toTournament: TOTournament, matchId: null | string): boolean
    {
        if (!matchId) {
            return false;
        }

        const match = this.findMatchById(toTournament, matchId);

        if (!match) {
            throw new Error('matchId refers to an inexistent match');
        }

        return this.isMatchDone(match);
    }

    /**
     * Should clear this game only, and its direct descendant.
     * Can't be done on deeper tournament game.
     *
     * @throws {TooDeepResetError} When trying to reset a too deep game in the tournament.
     */
    resetAndRecreateGame(tournament: Tournament, tournamentGame: TournamentGame): void
    {
        const toTournament = this.getTournament(tournament);
        const match = this.findMatchByRoundAndNumber(toTournament, tournamentGame.round, tournamentGame.number);

        if (!match) {
            throw new Error(`No match found for tournamentGame ${tournamentMatchNumber(tournamentGame)}`);
        }

        if (this.isMatchDoneById(toTournament, match.path.win) || this.isMatchDoneById(toTournament, match.path.loss)) {
            throw new TooDeepResetError('Cannot reset and clear this game, next match is already done. Can only reset matches when both next matches are not yet done.');
        }

        if ('setup' === toTournament.status || 'complete' === toTournament.status) {
            throw new TournamentEngineError('Cannot reset when tournament is not playing');
        }

        toTournament.clearResult(match.id);

        tournamentGame.state = 'playing'; // maybe 'waiting' in case we reset a game in a live round robin tournament and player is already on another game
        tournamentGame.hostedGame = null;

        const resetChildMatch = (childMatchId: null | string): void => {
            if (null === childMatchId) {
                return;
            }

            const childMatch = this.findMatchById(toTournament, childMatchId);

            if (!childMatch) {
                throw new Error('child match id refers to an inexistent match');
            }

            const childTournamentGame = findTournamentGameByRoundAndNumber(tournament, childMatch.round, childMatch.match);

            if (!childTournamentGame) {
                throw new Error(`Expected to have a tournament game for ${childMatch.round}.${childMatch.match}`);
            }

            childTournamentGame.state = 'waiting';
            childTournamentGame.player1 = null;
            childTournamentGame.player2 = null;
            childTournamentGame.hostedGame = null;

            childMatch.player1.win = 0;
            childMatch.player1.loss = 0;
            childMatch.player1.draw = 0;

            childMatch.player2.win = 0;
            childMatch.player2.loss = 0;
            childMatch.player2.draw = 0;

            this.doUpdateTournamentGame(tournament, childTournamentGame, childMatch);
        };

        resetChildMatch(match.path.win);
        resetChildMatch(match.path.loss);

        tournament.engineData = toTournament;
    }
}
