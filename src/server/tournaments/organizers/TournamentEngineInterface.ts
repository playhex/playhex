import { Tournament, TournamentGame } from '../../../shared/app/models/index.js';
import { PlayerIndex } from '../../../shared/game-engine/Types.js';

export interface TournamentEngineInterface
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
     * @throws {TournamentEngineError} If tournament could not start
     */
    start(tournament: Tournament): void;

    /**
     * Returns all currently active games.
     */
    getActiveGames(tournament: Tournament): TournamentGame[];

    /**
     * Will add/update TournamentGame in tournament.games
     * from tournament engine.
     *
     * TournamentGame are added with 0, 1 or 2 players, and without HostedGame.
     * HostedGame should be created/started once players are known and ready.
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

    /**
     * Clear results of a tournament game.
     * Reverses the progression of players in the bracket.
     */
    resetAndRecreateGame(tournament: Tournament, tournamentGame: TournamentGame): void;

    /**
     * Exclude a participant from a playing tournament.
     * Should adjust brackets.
     */
    excludeParticipant(tournament: Tournament, playerPublicId: string): void;
}
