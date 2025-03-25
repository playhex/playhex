import Tournament from '../../../shared/app/models/Tournament.js';
import TournamentGame from '../../../shared/app/models/TournamentGame.js';
import { PlayerIndex } from '../../../shared/game-engine/Types.js';

export interface TournamentOrganizerInterface
{
    /**
     * Whether this tournament organizer supports provided tournament
     */
    supports(tournament: Tournament): boolean;

    /**
     * An active tournament has been initialized.
     * Should init/reload tournament engine.
     */
    initTournamentEngine(tournament: Tournament): void;

    /**
     * Tournament has started,
     * should start tournament in the engine.
     *
     * @throws {TournamentError} If tournament could not start
     */
    start(tournament: Tournament): void;

    /**
     * Will add/update TournamentGame in tournament.games
     * from tournament engine.
     *
     * Should be called when brackets is updated:
     * (game has ended, player has moved)
     * to create new tournament games, update players in games.
     */
    updateTournamentGames(tournament: Tournament): void;

    /**
     * Will report the winner of a game,
     * and move players to next matches.
     *
     * Should be called once a game has ended.
     */
    reportWinner(tournament: Tournament, tournamentGame: TournamentGame, winnerIndex: PlayerIndex): void;

    /**
     * Update participant scores and tiebreaks values.
     */
    updateParticipantsScore(tournament: Tournament): void;

    /**
     * Whether the tournament engine says tournament is finished.
     */
    isFinished(tournament: Tournament): boolean;
}
