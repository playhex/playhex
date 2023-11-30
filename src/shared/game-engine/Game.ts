import EventEmitter from 'events';
import { IllegalMove, PlayerIndex, Move, PlayerGameInput, BOARD_DEFAULT_SIZE, PlayerInterface } from '.';
import TypedEmitter from 'typed-emitter';
import Board from './Board';

export type GameState =
    /**
     * Game has been created, waiting for both players ready.
     */
    'created'

    /**
     * Game has been started and is currently playing.
     */
    | 'playing'

    /**
     * Game has ended. Check winner and outcome.
     */
    | 'ended'
;

type GameEvents = {
    /**
     * Both players are ready,
     * the game can now accept moves,
     * chrono is started.
     */
    started: () => void;

    /**
     * A move have been played by a player. PlayerIndex is the player who made the move.
     * At this time, game.getCurrentPlayer() is the current player after move have been played.
     * If the move is winning, "winner" contains the actual winner. Otherwise contains null.
     */
    played: (move: Move, byPlayerIndex: PlayerIndex, winner: null | PlayerIndex) => void;

    /**
     * Game have been finished.
     */
    ended: (winner: PlayerIndex, outcome: Outcome) => void;
};

/**
 * How a game has ended.
 */
export type Outcome =
    /**
     * No outcome precision, game should have been won by regular victory,
     * or game is still playing, check "winner" attribute.
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
    private state: GameState = 'created';
    private board: Board;
    private currentPlayerIndex: PlayerIndex = 0;
    private movesHistory: Move[] = [];

    private winner: null | PlayerIndex = null;
    private outcome: Outcome = null;

    private startOnceReadyEnabled = false;

    private createdAt: Date = new Date();
    private startedAt: null | Date = null;
    private lastMoveAt: null | Date = null;
    private endedAt: null | Date = null;

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

        // Do no call startOnceAllPlayersReady() here to allow adding other "start" listeners.
    }

    getState(): GameState
    {
        return this.state;
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
        return 'ended' === this.state;
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

    /**
     * Just update properties, do not emit "ended" event.
     * Should be emitted manually.
     */
    private setWinner(playerIndex: PlayerIndex, outcome: Outcome = null): void
    {
        this.state = 'ended';
        this.winner = playerIndex;
        this.outcome = outcome;
        this.endedAt = new Date();
    }

    /**
     * Change game state by setting a winner and emitting "ended" event.
     */
    declareWinner(playerIndex: PlayerIndex, outcome: Outcome = null): void
    {
        if (null !== this.winner) {
            throw new Error('Cannot set a winner again, there is already a winner');
        }

        this.setWinner(playerIndex, outcome);

        this.emit('ended', playerIndex, outcome);
    }

    getOutcome(): Outcome
    {
        return this.outcome;
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
        if ('created' !== this.state) {
            throw new Error('Game already started');
        }

        if (!this.arePlayersReady()) {
            console.log(this);
            throw new Error('Cannot start, not all players are ready: ' + this.players.map(p => p.isReady()));
        }

        this.state = 'playing';
        this.startedAt = new Date();

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
        return 'created' !== this.state;
    }

    /**
     * @throws IllegalMove on invalid move.
     */
    checkMove(move: Move, playerIndex: PlayerIndex): void
    {
        if ('created' === this.state) {
            throw new IllegalMove(move, 'Game is not yet started');
        }

        if ('ended' === this.state) {
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
    move(move: Move, byPlayerIndex: PlayerIndex): void
    {
        this.checkMove(move, byPlayerIndex);
        this.board.setCell(move.getRow(), move.getCol(), byPlayerIndex);

        this.movesHistory.push(move);
        this.lastMoveAt = new Date();

        // Naively check connection on every move played
        if (this.board.hasPlayerConnection(byPlayerIndex)) {
            this.setWinner(byPlayerIndex, null);
        } else {
            this.changeCurrentPlayer();
        }

        this.emit('played', move, byPlayerIndex, this.getWinner());

        // Emit "ended" event after "played" event to keep order between events.
        if (this.hasWinner()) {
            this.emit('ended', this.getStrictWinner(), null);
        }
    }

    /**
     * Makes playerIndex resign
     */
    resign(playerIndex: PlayerIndex): void
    {
        this.declareWinner(0 === playerIndex ? 1 : 0, 'resign');
    }

    /**
     * Makes current player lose by time
     */
    loseByTime(): void
    {
        this.declareWinner(this.otherPlayerIndex(), 'time');
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

    getCreatedAt(): Date
    {
        return this.createdAt;
    }

    getStartedAt(): null | Date
    {
        return this.startedAt;
    }

    getLastMoveAt(): null | Date
    {
        return this.lastMoveAt;
    }

    getEndedAt(): null | Date
    {
        return this.endedAt;
    }
}
