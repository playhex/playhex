import { TypedEmitter } from 'tiny-typed-emitter';
import { ChatMessage, HostedGame, Move } from '../../../shared/app/models';

type NotifiableEvents = {
    gameStart: (hostedGame: HostedGame) => void;

    /**
     * A move have been played on a game.
     * Can be either me, as soon as I click on a cell,
     * or a move from another player on another game.
     *
     * move is not yet stacked in hostedGame.gameData.movesHistory
     */
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
