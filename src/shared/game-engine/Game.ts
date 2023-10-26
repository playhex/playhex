import EventEmitter from 'events';
import { IllegalMove, PlayerIndex, Move, PlayerGameInput, BOARD_DEFAULT_SIZE, PlayerInterface } from '.';
import TypedEmitter from 'typed-emitter';
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
    ended: (winner: PlayerIndex, outcomePrecision: OutcomePrecision) => void;
};

export type OutcomePrecision =
    /**
     * No outcome precision, game should have been won by regular victory
     */
    null

    /**
     * Player who lost manually resigned the game, before or while playing.
     */
    | 'resign'

    /**
     * Player who lost ran out of time while playing.
     * Assuming he already played at least one move.
     */
    | 'time'

    /**
     * Player who lost didn't played his first move,
     * or has been foreited by an external reason.
     */
    | 'forfeit'
;

/**
 * Player 0 must connect left to right
 * Player 1 must connect top to bottom
 */
export default class Game extends (EventEmitter as unknown as new () => TypedEmitter<GameEvents>)
{
    private board: Board;
    private startOnceReadyEnabled: boolean = false;
    private started = false;
    private currentPlayerIndex: PlayerIndex = 0;
    private winner: null|PlayerIndex = null;
    private outcomePrecision: OutcomePrecision = null;
    private movesHistory: Move[] = [];

    constructor(
        private players: [PlayerInterface, PlayerInterface],
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

        // Called to early, no time to bind events (ie time control binding) after new Game(), started event already dispatched if both players are already ready
        // should rename to "start once players ready"
        //this.startOnceAllPlayersReady();
    }

    getBoard(): Board
    {
        return this.board;
    }

    getSize(): number
    {
        return this.size;
    }

    getPlayers(): [PlayerInterface, PlayerInterface]
    {
        return this.players;
    }

    getPlayer(playerIndex: PlayerIndex): PlayerInterface
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

    getCurrentPlayer(): PlayerInterface
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

    setWinner(playerIndex: PlayerIndex, outcomePrecision: OutcomePrecision = null): void
    {
        if (null !== this.winner) {
            throw new Error('Cannot set a winner again, there is already a winner');
        }

        this.winner = playerIndex;
        this.outcomePrecision = outcomePrecision;

        this.emit('ended', playerIndex, outcomePrecision);
    }

    getOutcomePrecision(): OutcomePrecision
    {
        return this.outcomePrecision;
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

    arePlayersReady(): boolean
    {
        return this.players.every(p => p.isReady());
    }

    start(): void
    {
        if (this.started) {
            throw new Error('Game already started');
        }

        if (!this.arePlayersReady()) {
            console.log(this);
            throw new Error('Cannot start, not all players are ready: ' + this.players.map(p => p.isReady()));
        }

        this.started = true;

        this.emit('started');
    }

    startOnceAllPlayersReady(): Game
    {
        if (this.startOnceReadyEnabled) {
            return this;
        }

        this.startOnceReadyEnabled = true;

        const playerReadyListener = (ready: boolean): void => {
            if (ready && this.arePlayersReady()) {
                this.start();
                this.players.forEach(p => p.off('readyStateChanged', playerReadyListener));
            }
        };

        this.players.forEach(p => p.on('readyStateChanged', playerReadyListener));

        playerReadyListener(true);

        return this;
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
     * Makes playerIndex resign
     */
    resign(playerIndex: PlayerIndex): void
    {
        this.setWinner(0 === playerIndex ? 1 : 0, 'resign');
    }

    /**
     * Makes current player lose by time
     */
    loseByTime(): void
    {
        this.setWinner(this.otherPlayerIndex(), 'time');
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
