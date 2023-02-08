import EventEmitter from 'events';
import { IllegalMove, PlayerIndex, Move, PlayerGameInput, BOARD_DEFAULT_SIZE } from '.';
import TypedEmitter from 'typed-emitter';
import Player from './Player';
import Board from './Board';

type GameEvents = {
    /**
     * Both players are ready,
     * the game can now accept moves,
     * chrono is started.
     */
    started: () => void;

    /**
     * A move have been played by a player. PlayerIndex is the player who made the move.
     */
    played: (move: Move, byPlayerIndex: PlayerIndex) => void;

    /**
     * Game have been finished.
     */
    ended: (winner: PlayerIndex) => void;
};

/**
 * Player 0 must connect left to right
 * Player 1 must connect top to bottom
 */
export default class Game extends (EventEmitter as unknown as new () => TypedEmitter<GameEvents>)
{
    private board: Board;
    private started = false;
    private currentPlayerIndex: PlayerIndex = 0;
    private winner: null|PlayerIndex = null;
    private movesHistory: Move[] = [];

    constructor(
        private players: [Player, Player],
        private size: number = BOARD_DEFAULT_SIZE,
    ) {
        super();

        this.board = new Board(size);

        players[0].setPlayerGameInput(new PlayerGameInput(this, 0));
        players[1].setPlayerGameInput(new PlayerGameInput(this, 1));

        this.on('started', () => players[0].emit('myTurnToPlay'));
        this.on('played', () => {
            if (!this.hasWinner()) {
                players[this.currentPlayerIndex].emit('myTurnToPlay');
            }
        });

        this.listenPlayersReady();
    }

    private listenPlayersReady(): void
    {
        const playerReadyListener = (ready: boolean): void => {
            if (ready && this.players.every(player => player.isReady())) {
                this.start();

                this.players.forEach(player => {
                    player.off('readyStateChanged', playerReadyListener);
                });
            }
        };

        this.players.forEach(player => {
            player.on('readyStateChanged', playerReadyListener);
        });

        playerReadyListener(true);
    }

    getBoard(): Board
    {
        return this.board;
    }

    getSize(): number
    {
        return this.size;
    }

    getPlayers(): [Player, Player]
    {
        return this.players;
    }

    getPlayer(playerIndex: PlayerIndex): Player
    {
        return this.players[playerIndex];
    }

    getCurrentPlayerIndex(): PlayerIndex
    {
        return this.currentPlayerIndex;
    }

    setCurrentPlayerIndex(currentPlayerIndex: PlayerIndex): void
    {
        this.currentPlayerIndex = currentPlayerIndex;
    }

    getCurrentPlayer(): Player
    {
        return this.players[this.currentPlayerIndex];
    }

    hasWinner(): boolean
    {
        return null !== this.winner;
    }

    isEnded(): boolean
    {
        return null !== this.winner;
    }

    getWinner(): null | PlayerIndex
    {
        return this.winner;
    }

    getStrictWinner(): PlayerIndex
    {
        if (null === this.winner) {
            throw new Error('Trying to strictly get the winner but game not finished');
        }

        return this.winner;
    }

    setWinner(playerIndex: PlayerIndex): void
    {
        if (null !== this.winner) {
            throw new Error('Cannot set a winner again, there is already a winner');
        }

        this.winner = playerIndex;

        this.emit('ended', playerIndex);
    }

    getMovesHistory(): Move[]
    {
        return this.movesHistory;
    }

    setMovesHistory(movesHistory: Move[]): Game
    {
        this.movesHistory = movesHistory;

        return this;
    }

    getLastMove(): null | Move
    {
        if (0 === this.movesHistory.length) {
            return null;
        }

        return this.movesHistory[this.movesHistory.length - 1];
    }

    start(): void
    {
        if (this.started) {
            throw new Error('Game already started');
        }

        this.started = true;

        this.emit('started');
    }

    isStarted(): boolean
    {
        return this.started;
    }

    /**
     * @throws IllegalMove on invalid move.
     */
    checkMove(move: Move, playerIndex: PlayerIndex): void
    {
        if (!this.started) {
            throw new IllegalMove(move, 'Game is not yet started');
        }

        if (this.isEnded()) {
            throw new IllegalMove(move, 'Game is over');
        }

        if (!this.board.containsCoords(move.getRow(), move.getCol())) {
            throw new IllegalMove(move, 'Cell outside board');
        }

        if (!this.board.isEmpty(move.getRow(), move.getCol())) {
            throw new IllegalMove(move, 'This cell is already occupied');
        }

        if (this.currentPlayerIndex !== playerIndex) {
            throw new IllegalMove(move, 'Not your turn');
        }
    }

    /**
     * Validate and make current play move, and change player.
     *
     * @throws IllegalMove on invalid move.
     */
    move(move: Move, playerIndex: PlayerIndex): void
    {
        this.checkMove(move, playerIndex);
        this.board.setCell(move.getRow(), move.getCol(), playerIndex);

        this.movesHistory.push(move);

        // Naively check connection on every move played
        if (this.board.hasPlayerConnection(playerIndex)) {
            this.setWinner(playerIndex);
        } else {
            this.changeCurrentPlayer();
        }

        this.emit('played', move, playerIndex);
    }

    /**
     * Makes current player abandon
     */
    abandon(): void
    {
        this.changeCurrentPlayer();
        this.setWinner(this.currentPlayerIndex);
    }

    otherPlayerIndex(): PlayerIndex
    {
        return 0 === this.currentPlayerIndex
            ? 1
            : 0
        ;
    }

    private changeCurrentPlayer(): void
    {
        this.currentPlayerIndex = this.otherPlayerIndex();
    }
}
