import { TypedEmitter } from 'tiny-typed-emitter';
import { ChatMessage, Game, LadderChallenge, Player, PlayerModerationAction, Tournament } from '../../../shared/app/models/index.js';
import { TimestampedMove } from '../../../shared/game-engine/Types.js';

type NotifiableEvents = {
    gameStart: (game: Game) => void;

    /**
     * A move have been played on a game.
     * Can be either me, as soon as I click on a cell,
     * or a move from another player on another game.
     *
     * move is not yet stacked in game.moves
     */
    move: (game: Game, timestampedMove: TimestampedMove) => void;

    /**
     * A game ended. Only ended: not canceled.
     */
    gameEnd: (game: Game) => void;

    /**
     * A game has been canceled.
     */
    gameCanceled: (game: Game) => void;

    /**
     * A player has just been challenged nominatively by another player.
     *
     * @param opponent The challenged player (targeted by game.opponentPublicId)
     */
    gameChallengeCreated: (game: Game, opponent: Player) => void;

    /**
     * Chat message received on a game.
     *
     * Be careful to not emit event for shadow deleted chat messages.
     */
    chatMessage: (game: Game, chatMessage: ChatMessage) => void;

    /**
     * When a player has few seconds left to play.
     * Notified once, at 10 seconds, for any player of any game.
     */
    gameTimeControlWarning: (game: Game) => void;

    /**
     * When a tournament check-in period just opened,
     * and subscribed players should check-in.
     */
    tournamentCheckInOpen: (tournament: Tournament) => void;

    /**
     * For communication, notification to players that may have been victim of hard words,
     * to inform them that the player has been moderated.
     *
     * @param moderatedPlayer Player who have been moderated: chat message deleted, and player is now chat restricted or just warned
     * @param game One of the game where related chat messages have been posted
     */
    moderationActionTaken: (action: PlayerModerationAction) => void;

    /**
     * A player challenged another one in a ladder, and the game started.
     * challenge contains challenger, defender and game.
     */
    ladderChallenge: (challenge: LadderChallenge) => void;

    /**
     * A player challenged another one in a ladder, and proposed to play live.
     * Defender must accept or decline.
     */
    ladderLiveProposal: (challenge: LadderChallenge) => void;

    /**
     * A player timed out a ladder game, and got a strike.
     *
     * @param strikes Number of strikes in the current window, including this one
     * @param removed Whether player has been removed from ladder because of too many strikes
     */
    ladderStrike: (player: Player, strikes: number, removed: boolean) => void;

    /**
     * A player has been removed from a ladder because of inactivity.
     */
    ladderRemovedInactive: (player: Player) => void;
};

export const notifier = new TypedEmitter<NotifiableEvents>();
