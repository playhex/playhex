import TournamentOrganizer from 'tournament-organizer';
import { Tournament as TOTournament, Player as TOPlayer, Match } from 'tournament-organizer/components';
import { PlayerIndex } from '../shared/game-engine/Types.js';
import { Player, Tournament, TournamentGame } from '../shared/app/models/index.js';
import { StandingsValues } from 'tournament-organizer/interfaces';

const tournamentOrganizer = new TournamentOrganizer();

/**
 * A tournament that can be started, games can end and results reported...
 * This class manages a tournament with the library "tournament-organizer".
 */
export class ActiveTournament
{
    private toTournament: TOTournament;

    constructor(
        private tournament: Tournament,
    ) {
        this.init();
    }

    private init(): void
    {
        if (this.tournament.engineData) {
            this.toTournament = tournamentOrganizer.reloadTournament(this.tournament.engineData);
            return;
        }

        this.toTournament = tournamentOrganizer.createTournament(this.tournament.publicId, {
            stageOne: {
                format: this.tournament.stage1Format ?? undefined,
                rounds: this.tournament.stage1Rounds ?? undefined,
                maxPlayers: this.tournament.maxPlayers ?? undefined,
                consolation: this.tournament.consolation ?? undefined,
            },
            stageTwo: this.tournament.stage2Format ? {
                format: this.tournament.stage2Format ?? undefined,
                consolation: this.tournament.consolation ?? undefined,
            } : undefined,
            players: this.tournament.participants.map(participant => {
                return new TOPlayer(participant.player.publicId, participant.player.pseudo);
            }),
        });

        this.tournament.engineData = this.toTournament;
    }

    getTournament(): Tournament
    {
        return this.tournament;
    }

    /**
     * Tournament has started,
     * should start tournament in the engine.
     */
    started(): void
    {
        this.toTournament.start();

        this.tournament.engineData = this.toTournament;
    }

    private getParticipant(publicId: string): Player
    {
        for (const participant of this.tournament.participants) {
            if (participant.player.publicId === publicId) {
                return participant.player;
            }
        }

        throw new Error(`Player with public id "${publicId}" not in tournament participants`);
    }

    /**
     * Will add/update TournamentGame in tournament.games
     * from tournament engine.
     *
     * Should be called when brackets is updated:
     * (game has ended, player has moved)
     * to create new tournament games, update players in games.
     */
    updateTournamentGames(): void
    {
        this.nextRoundOrEndTournament();

        // Create new tournamentGames for new matches
        const tournamentGames: { [matchId: string]: TournamentGame } = {};

        for (const tournamentGame of this.tournament.games) {
            tournamentGames[tournamentGame.engineGameId] = tournamentGame;
        }

        for (const match of this.toTournament.matches) {
            if (!tournamentGames[match.id]) {
                this.tournament.games.push(this.doCreateTournamentGame(match));
            } else if ('waiting' === tournamentGames[match.id].state) {
                this.doUpdateTournamentGame(tournamentGames[match.id], match);
            }
        }

        this.tournament.engineData = this.toTournament;
    }

    private doCreateTournamentGame(match: Match): TournamentGame
    {
        const tournamentGame = new TournamentGame();

        tournamentGame.state = match.bye ? 'done' : 'waiting';
        tournamentGame.round = match.round;
        tournamentGame.number = match.match;
        tournamentGame.engineGameId = match.id;
        tournamentGame.bye = match.bye;

        if (match.player1.id) {
            tournamentGame.player1 = this.getParticipant(match.player1.id);
        }

        if (match.player2.id) {
            tournamentGame.player2 = this.getParticipant(match.player2.id);
        }

        return tournamentGame;
    }

    private doUpdateTournamentGame(tournamentGame: TournamentGame, match: Match): void
    {
        if (!tournamentGame.player1 && match.player1.id) {
            tournamentGame.player1 = this.getParticipant(match.player1.id);
        }

        if (!tournamentGame.player2 && match.player2.id) {
            tournamentGame.player2 = this.getParticipant(match.player2.id);
        }
    }

    /**
     * Will report the winner of a game,
     * and move players to next matches.
     *
     * Should be called once a game has ended.
     */
    reportWinner(tournamentGame: TournamentGame, winnerIndex: PlayerIndex): void
    {
        const match = this.toTournament.matches.find(({ id }) =>
            id === tournamentGame.engineGameId,
        );

        if (!match) {
            throw new Error(`No match found for game round=${tournamentGame.round} match=${tournamentGame.number}`);
        }

        // winner already reported
        if (!match.active) {
            return;
        }

        this.toTournament.enterResult(
            match.id,
            0 === winnerIndex ? 1 : 0,
            1 === winnerIndex ? 1 : 0,
        );

        this.nextRoundOrEndTournament();

        this.tournament.engineData = this.toTournament;
    }

    private nextRoundOrEndTournament(): void
    {
        if (0 === this.toTournament.matches.length) {
            return;
        }

        if (this.toTournament.matches.every(match => !match.active)) {
            try {
                this.toTournament.next();
            } catch (e) {
                this.toTournament.end();
            }
        }
    }

    /**
     * Update participant scores and tiebreaks values.
     */
    updateParticipantsScore(): void
    {
        const standings = this.toTournament.standings(false);
        const playerStanding: { [playerPublicId: string]: StandingsValues } = {};

        for (const standing of standings) {
            playerStanding[standing.player.id] = standing;
        }

        for (const participant of this.tournament.participants) {
            participant.score = playerStanding[participant.player.publicId].matchPoints;
            participant.tiebreak = playerStanding[participant.player.publicId].tiebreaks.medianBuchholz;
        }
    }

    isFinished(): boolean
    {
        return 'complete' === this.toTournament.status;
    }
}
