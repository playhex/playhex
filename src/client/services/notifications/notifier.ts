import { TypedEmitter } from 'tiny-typed-emitter';
import { ChatMessage, Game, Player } from '../../../shared/app/models/index.js';
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
     * A game ended, or canceled.
     */
    gameEnd: (game: Game) => void;

    /**
     * A player offers a rematch.
     * Rematch game is available in game.rematch
     * To know who offered the rematch, check game.rematch.host
     */
    rematchOffer: (game: Game) => void;

    /**
     * I have just been nominatively challenged by another player.
     * game.host is the challenger.
     */
    gameChallengeCreated: (game: Game) => void;

    /**
     * Chat message received on a game
     */
    chatMessage: (game: Game, chatMessage: ChatMessage) => void;

    /**
     * When a player has few seconds left to play.
     * Notified once, at 10 seconds, for any player of any game.
     */
    gameTimeControlWarning: (game: Game) => void;

    /**
     * A player want to takeback his move.
     */
    takebackRequested: (game: Game, byPlayer: Player) => void;

    /**
     * Player accepted his opponent request to takeback his move.
     *
     * @param playerTakeback Player who wanted to takeback his move.
     */
    takebackAnswered: (game: Game, accepted: boolean, playerTakeback: Player) => void;
};

export const notifier = new TypedEmitter<NotifiableEvents>();
