import { Tournament, TournamentMatch } from '../../../shared/app/models/index.js';
import { PlayerIndex } from '../../../shared/game-engine/Types.js';

/**
 * Bridge between application and tournament library.
 * Can support a format of tournament and not another.
 *
 * Application will interact with a TournamentEngine implementation
 * by sending update, and the implementation can read/update a Tournament instance.
 */
export interface TournamentEngineInterface
{
    /**
     * Whether this tournament organizer supports provided tournament
     */
    supports(tournament: Tournament): boolean;

    /**
     * An active tournament has been initialized.
     * Tournament can be in "created" or "running" state.
     * Should reload tournament from `tournament.engineData`.
     * May do nothing if tournament is not started and no initialization work is necessary.
     */
    reloadTournament(tournament: Tournament): Promise<void>;

    /**
     * Tournament has started,
     * should start tournament in the engine.
     * tournament.participants are now set.
     *
     * @throws {TournamentEngineError} If tournament could not start
     */
    start(tournament: Tournament): void;

    /**
     * Returns all matches currently in an "playing" state in the engine.
     * Used to make sure we have reported the match as "ended" in the engine
     * when game has ended, and not be stuck.
     */
    getActiveMatches(tournament: Tournament): TournamentMatch[];

    /**
     * Will add/update TournamentMatch in tournament.matches
     * from tournament engine.
     *
     * TournamentMatch are added with 0, 1 or 2 players, and without HostedGame.
     * HostedGame should be created/started once players are known and ready.
     *
     * Also fill winnerPath and loserPath.
     *
     * Should be called when brackets is updated:
     * (game has ended, player has moved)
     * to create new tournament matches, update players in games.
     */
    updateTournamentMatches(tournament: Tournament): void;

    /**
     * Tells if a TournamentMatch can start.
     * Provided TournamentMatch is in waiting state, and both players known.
     *
     * In most case that won't do anything, but some extra conditions can be added here,
     * depending on tournament format.
     *
     * Throws an error with the reason if a game cannot start yet.
     *
     * @throws {CannotStartTournamentMatchError} If tournament match cannot start
     */
    checkBeforeStart(tournament: Tournament, tournamentMatch: TournamentMatch): void;

    /**
     * Will report the winner of a match,
     * and move players to next matches.
     *
     * Should be called once a game has ended.
     */
    reportWinner(tournament: Tournament, tournamentMatch: TournamentMatch, winnerIndex: PlayerIndex): void;

    /**
     * Update participant scores and tiebreaks values.
     */
    updateParticipantsScore(tournament: Tournament): void;

    /**
     * Whether the tournament engine says tournament is finished.
     */
    isFinished(tournament: Tournament): boolean;

    /**
     * Clear results of a tournament match.
     * Reverts the progression of players in the bracket.
     */
    resetAndRecreateMatch(tournament: Tournament, tournamentMatch: TournamentMatch): void;
}
