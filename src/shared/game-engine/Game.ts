import EventEmitter from 'events';
import { IllegalMove, PlayerIndex, Move, PlayerGameInput, BOARD_DEFAULT_SIZE, PlayerInterface } from '.';
import TypedEmitter from 'typed-emitter';
import Board from './Board';
import { Tuple } from '../app/Types';

export type GameState =
    /**
     * Game has been created, waiting for start() to be called.
     * Before starting, time control can be initialized, players can join...
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
     * The game has started and can now accept moves.
     * Chrono is started.
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

    /**
     * Game has been canceled, so game is over, but no winner.
     */
    canceled: () => void;
};

/**
 * How a game has ended.
 */
export type Outcome =
    /**
     * No outcome precision, game should have been won by regular victory,
     * or game is still playing, or has been canceled.
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

export default class Game extends (EventEmitter as unknown as new () => TypedEmitter<GameEvents>)
{
    private state: GameState = 'created';
    private board: Board;
    private currentPlayerIndex: PlayerIndex = 0;
    private movesHistory: Move[] = [];

    private winner: null | PlayerIndex = null;
    private outcome: Outcome = null;

    private createdAt: Date = new Date();
    private startedAt: null | Date = null;
    private lastMoveAt: null | Date = null;
    private endedAt: null | Date = null;

    /**
     * @param boardOrSize
     *  Board size to initialize game with an empty board,
     *  or a pre-built board instance to play on.
     *  Default to an empty board with a default size.
     *
     * @param players
     *  If provided, players will receive an instance of game input on game start,
     *  and will be notified when it is their turn.
     */
    constructor(
        boardOrSize: Board | number = BOARD_DEFAULT_SIZE,
        private players: null | Tuple<PlayerInterface> = null,
    ) {
        super();

        this.board = boardOrSize instanceof Board
            ? boardOrSize
            : new Board(boardOrSize)
        ;
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
        return this.board.getSize();
    }

    hasPlayers(): boolean
    {
        return null !== this.players;
    }

    getPlayers(): Tuple<PlayerInterface>
    {
        if (null === this.players) {
            throw new Error('This game is not using players');
        }

        return this.players;
    }

    setPlayers(players: Tuple<PlayerInterface>): void
    {
        if (this.state !== 'created') {
            throw new Error(
                'Cannot set players now, game is already started,'
                + ' and previous players are already bind to this game.',
            );
        }

        this.players = players;
    }

    getPlayer(playerIndex: PlayerIndex): PlayerInterface
    {
        if (null === this.players) {
            throw new Error('This game is not using players');
        }

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
        if (null === this.players) {
            throw new Error('This game is not using players');
        }

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
            throw new Error('Trying to strictly get the winner but game not finished or canceled');
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

        if (this.state === 'ended') {
            throw new Error('Cannot set a winner, game is already ended, probably canceled');
        }

        this.setWinner(playerIndex, outcome);

        this.emit('ended', playerIndex, outcome);
    }

    cancel(): void
    {
        if (this.state === 'ended') {
            throw new Error('Cannot cancel, game already ended');
        }

        this.state = 'ended';
        this.endedAt = new Date();

        this.emit('canceled');
    }

    isCanceled(): boolean
    {
        return this.state === 'ended' && null === this.winner;
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

    private bindPlayers(players: Tuple<PlayerInterface>): void
    {
        players[0].setPlayerGameInput(new PlayerGameInput(this, 0));
        players[1].setPlayerGameInput(new PlayerGameInput(this, 1));

        this.on('played', () => {
            if (!this.hasWinner()) {
                players[this.currentPlayerIndex].emit('myTurnToPlay');
            }
        });

        this.on('started', () => players[0].emit('myTurnToPlay'));
    }

    start(): void
    {
        if ('created' !== this.state) {
            throw new Error('Game already started');
        }

        this.state = 'playing';
        this.startedAt = new Date();

        if (null !== this.players) {
            this.bindPlayers(this.players);
        }

        this.emit('started');
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

    setCreatedAt(date: Date): this
    {
        this.createdAt = date;

        return this;
    }

    getStartedAt(): null | Date
    {
        return this.startedAt;
    }

    setStartedAt(date: Date): this
    {
        this.startedAt = date;

        return this;
    }

    getLastMoveAt(): null | Date
    {
        return this.lastMoveAt;
    }

    setLastMoveAt(date: Date): this
    {
        this.lastMoveAt = date;

        return this;
    }

    getEndedAt(): null | Date
    {
        return this.endedAt;
    }

    setEndedAt(date: Date): this
    {
        this.endedAt = date;

        return this;
    }
}
