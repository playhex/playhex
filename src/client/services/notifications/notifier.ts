import { TypedEmitter } from 'tiny-typed-emitter';
import { ChatMessage, HostedGame, Move } from '../../../shared/app/models';

type NotifiableEvents = {
    gameStart: (hostedGame: HostedGame) => void;

    move: (hostedGame: HostedGame, move: Move) => void;

    /**
     * A game ended, or canceled.
     */
    gameEnd: (hostedGame: HostedGame) => void;

    /**
     * Chat message received on a game
     */
    chatMessage: (hostedGame: HostedGame, chatMessage: ChatMessage) => void;

    /**
     * When a player has few seconds left to play.
     * Notified once, at 10 seconds, for any player of any game.
     */
    gameTimeControlWarning: (hostedGame: HostedGame) => void;
};

export const notifier = new TypedEmitter<NotifiableEvents>();
