/**
 * Thrown by tournament system
 */
export class TournamentError extends Error {}

export class PlayerIsBannedTournamentError extends TournamentError {}
export class AccountRequiredTournamentError extends TournamentError {}
export class GamePlayerNotFoundTournamentError extends TournamentError {}

/**
 * Thrown by tournament engines implementations
 */
export class TournamentEngineError extends TournamentError {}

export class NotEnoughParticipantsToStartTournamentError extends TournamentEngineError {}
export class TooDeepResetError extends TournamentEngineError {}
export class CannotStartTournamentMatchError extends TournamentEngineError {}
