import TournamentOrganizer from 'tournament-organizer';
import { StandingsValues } from 'tournament-organizer/interfaces';
import { Tournament as TOTournament, Player as TOPlayer, Match } from 'tournament-organizer/components';
import { tournamentFormatStage1Values, tournamentFormatStage2Values, tournamentMatchNumber } from '../../../shared/app/tournamentUtils.js';
import { TournamentEngineInterface } from './TournamentEngineInterface.js';
import { NotEnoughParticipantsToStartTournamentError, TooDeepResetError, TournamentEngineError } from '../TournamentError.js';
import { Service } from 'typedi';
import { Tournament, TournamentGame, Player } from '../../../shared/app/models/index.js';
import { PlayerIndex } from '../../../shared/game-engine/Types.js';

const tournamentOrganizer = new TournamentOrganizer();

const toTournaments: { [publicId: string]: TOTournament } = {};

@Service()
export class SlashinftyTournamentOrganizer implements TournamentEngineInterface
{
    supports(tournament: Tournament): boolean
    {
        return tournamentFormatStage1Values.includes(tournament.stage1Format)
            && (
                null === tournament.stage2Format
                || tournamentFormatStage2Values.includes(tournament.stage2Format)
            )
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

    private findTournamentGameByRoundAndNumber(tournament: Tournament, round: number, number: number): null | TournamentGame
    {
        return tournament.games.find(game => game.round === round && game.number === number) ?? null;
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

    updateTournamentGames(tournament: Tournament): void
    {
        const toTournament = this.getTournament(tournament);

        this.nextRoundOrEndTournament(tournament);

        const tournamentGames = this.getTournamentGamesByRoundAndNumber(tournament);

        for (const match of toTournament.matches) {
            const roundAndNumber = `${match.round}.${match.match}`;
            let tournamentGame = tournamentGames[roundAndNumber];

            // Create new tournamentGames for new matches
            if (!tournamentGame) {
                tournamentGame = this.doCreateTournamentGame(tournament, match);
                tournamentGames[roundAndNumber] = tournamentGame;
            } else if ('done' !== tournamentGame.state) {
                this.doUpdateTournamentGame(tournament, tournamentGame, match);
            }
        }

        tournament.engineData = toTournament;
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
        tournamentGame.player1 = match.player1.id
            ? this.getParticipant(tournament, match.player1.id)
            : null
        ;

        tournamentGame.player2 = match.player2.id
            ? this.getParticipant(tournament, match.player2.id)
            : null
        ;

        tournamentGame.bye = match.bye;
        tournamentGame.state = this.getTournamentStateFromMatch(match);
    }

    private doCreateTournamentGame(tournament: Tournament, match: Match): TournamentGame
    {
        const tournamentGame = new TournamentGame();

        tournamentGame.tournament = tournament;
        tournamentGame.round = match.round;
        tournamentGame.number = match.match;

        this.doUpdateTournamentGame(tournament, tournamentGame, match);

        tournament.games.push(tournamentGame);

        return tournamentGame;
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

    private getTournamentStateFromMatch(match: Match): TournamentGame['state']
    {
        const { player1, player2, bye, active } = match;

        if (bye) {
            return 'done';
        }

        if (active) {
            return 'playing';
        }

        if (player1.win || player1.loss || player1.draw
            || player2.win || player2.loss || player2.draw
        ) {
            return 'done';
        }

        return 'waiting';
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

        toTournament.clearResult(match.id);

        tournamentGame.state = 'playing';
        tournamentGame.hostedGame = null;

        const resetChildMatch = (childMatchId: null | string): void => {
            if (null === childMatchId) {
                return;
            }

            const childMatch = this.findMatchById(toTournament, childMatchId);

            if (!childMatch) {
                throw new Error('child match id refers to an inexistent match');
            }

            const childTournamentGame = this.findTournamentGameByRoundAndNumber(tournament, childMatch.round, childMatch.match);

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

    excludeParticipant(tournament: Tournament, playerPublicId: string): void
    {
        const toTournament = this.getTournament(tournament);
        const toPlayer = toTournament.players.find(p => p.id = playerPublicId);

        if (!toPlayer) {
            throw new TournamentEngineError('No player with this id in tournament');
        }

        toTournament.removePlayer(toPlayer.id);

        this.updateTournamentGames(tournament);

        tournament.engineData = toTournament;
    }
}
