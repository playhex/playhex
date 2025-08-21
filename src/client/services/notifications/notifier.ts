import { TypedEmitter } from 'tiny-typed-emitter';
import { ChatMessage, HostedGame, Move, Player } from '../../../shared/app/models/index.js';

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
     * A player offers a rematch.
     * Rematch hostedGame is available in hostedGame.rematch
     * To know who offered the rematch, check hostedGame.rematch.host
     */
    rematchOffer: (hostedGame: HostedGame) => void;

    /**
     * Chat message received on a game
     */
    chatMessage: (hostedGame: HostedGame, chatMessage: ChatMessage) => void;

    /**
     * When a player has few seconds left to play.
     * Notified once, at 10 seconds, for any player of any game.
     */
    gameTimeControlWarning: (hostedGame: HostedGame) => void;

    /**
     * A player want to takeback his move.
     */
    takebackRequested: (hostedGame: HostedGame, byPlayer: Player) => void;

    /**
     * Player accepted his opponent request to takeback his move.
     *
     * @param playerTakeback Player who wanted to takeback his move.
     */
    takebackAnswered: (hostedGame: HostedGame, accepted: boolean, playerTakeback: Player) => void;
};

export const notifier = new TypedEmitter<NotifiableEvents>();
