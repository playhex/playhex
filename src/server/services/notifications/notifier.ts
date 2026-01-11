import { TypedEmitter } from 'tiny-typed-emitter';
import { ChatMessage, HostedGame, Tournament } from '../../../shared/app/models/index.js';
import { TimestampedMove } from '../../../shared/game-engine/Types.js';

type NotifiableEvents = {
    gameStart: (hostedGame: HostedGame) => void;

    /**
     * A move have been played on a game.
     * Can be either me, as soon as I click on a cell,
     * or a move from another player on another game.
     *
     * move is not yet stacked in hostedGame.moves
     */
    move: (hostedGame: HostedGame, timestampedMove: TimestampedMove) => void;

    /**
     * A game ended. Only ended: not canceled.
     */
    gameEnd: (hostedGame: HostedGame) => void;

    /**
     * A game has been canceled.
     */
    gameCanceled: (hostedGame: HostedGame) => void;

    /**
     * Chat message received on a game.
     *
     * Be careful to not emit event for shadow deleted chat messages.
     */
    chatMessage: (hostedGame: HostedGame, chatMessage: ChatMessage) => void;

    /**
     * When a player has few seconds left to play.
     * Notified once, at 10 seconds, for any player of any game.
     */
    gameTimeControlWarning: (hostedGame: HostedGame) => void;

    /**
     * When a tournament check-in period just opened,
     * and subscribed players should check-in.
     */
    tournamentCheckInOpen: (tournament: Tournament) => void;
};

export const notifier = new TypedEmitter<NotifiableEvents>();
