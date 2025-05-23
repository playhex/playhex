import TournamentOrganizer from 'tournament-organizer';
import { StandingsValues } from 'tournament-organizer/interfaces';
import { Tournament as TOTournament, Player as TOPlayer, Match } from 'tournament-organizer/components';
import { tournamentFormatStage1Values, tournamentFormatStage2Values } from '../../../shared/app/tournamentUtils.js';
import { TournamentEngineInterface } from './TournamentEngineInterface.js';
import { TournamentError } from '../TournamentError.js';
import { Service } from 'typedi';
import { Tournament, TournamentGame, Player } from '../../../shared/app/models/index.js';
import { PlayerIndex } from '../../../shared/game-engine/Types.js';

const tournamentOrganizer = new TournamentOrganizer();

const toTournaments: { [publicId: string]: TOTournament } = {};

const createToTournament = (tournament: Tournament): TOTournament => {
    const toTournament = tournamentOrganizer.createTournament(tournament.publicId, {
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
    });

    toTournaments[tournament.publicId] = toTournament;

    return toTournament;
};

const reloadToTournament = (tournament: Tournament): TOTournament => {
    if (!tournament.engineData) {
        throw new Error('Tried to reload tournament but no tournament engine data');
    }

    const toTournament = tournamentOrganizer.reloadTournament(tournament.engineData);

    toTournaments[tournament.publicId] = toTournament;

    return toTournament;
};

const getTournament = (tournament: Tournament): TOTournament => {
    const toTournament = toTournaments[tournament.publicId];

    if (undefined === toTournament) {
        throw new Error(`No loaded toTournament for tournament "${tournament.publicId}".`);
    }

    return toTournament;
};

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

    initTournamentEngine(tournament: Tournament)
    {
        if ('running' === tournament.state) {
            reloadToTournament(tournament);
        }
    }

    start(tournament: Tournament): void
    {
        const toTournament = createToTournament(tournament);

        try {
            toTournament.start();
        } catch (e) {
            if ('string' === typeof e) {
                throw new TournamentError(e);
            }

            throw new TournamentError(e.message);
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
            tournamentGames[`${tournamentGame.round}.${tournamentGame.number}`] = tournamentGame;
        }

        return tournamentGames;
    }

    updateTournamentGames(tournament: Tournament): void
    {
        const toTournament = getTournament(tournament);

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

        tournament.engineData = toTournament;
    }

    private nextRoundOrEndTournament(tournament: Tournament): void
    {
        const toTournament = getTournament(tournament);

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
        const toTournament = getTournament(tournament);
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
        const toTournament = getTournament(tournament);

        const match = toTournament.matches.find(({ round, match }) =>
            tournamentGame.round === round && tournamentGame.number === match,
        );

        if (!match) {
            throw new Error(`No match found for game round=${tournamentGame.round} match=${tournamentGame.number}`);
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
        const toTournament = getTournament(tournament);

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
        const toTournament = getTournament(tournament);

        return 'complete' === toTournament.status;
    }
}
