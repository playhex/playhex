import { IllegalMove, PlayerIndex, Move, BOARD_DEFAULT_SIZE } from '.';
import { TypedEmitter } from 'tiny-typed-emitter';
import Board from './Board';
import { GameData, Outcome } from './Types';

type GameEvents = {
    /**
     * A move have been played by a player. PlayerIndex is the player who made the move.
     * At this time, game.getCurrentPlayer() is the current player after move have been played.
     * If the move is winning, "winner" contains the actual winner. Otherwise contains null.
     */
    played: (move: Move, moveIndex: number, byPlayerIndex: PlayerIndex, winner: null | PlayerIndex) => void;

    /**
     * Game have been finished.
     */
    ended: (winner: PlayerIndex, outcome: Outcome) => void;

    /**
     * Game has been canceled, so game is over, but no winner.
     */
    canceled: () => void;
};

export default class Game extends TypedEmitter<GameEvents>
{
    private board: Board;
    private currentPlayerIndex: PlayerIndex = 0;
    private movesHistory: Move[] = [];
    private allowSwap = true;

    private winner: null | PlayerIndex = null;
    private outcome: Outcome = null;

    private startedAt: Date = new Date();
    private lastMoveAt: null | Date = null;
    private endedAt: null | Date = null;

    /**
     * @param boardOrSize
     *  Board size to initialize game with an empty board,
     *  or a pre-built board instance to play on.
     *  Default to an empty board with a default size.
     */
    constructor(
        boardOrSize: Board | number = BOARD_DEFAULT_SIZE,
    ) {
        super();

        this.board = boardOrSize instanceof Board
            ? boardOrSize
            : new Board(boardOrSize)
        ;
    }

    getBoard(): Board
    {
        return this.board;
    }

    getSize(): number
    {
        return this.board.getSize();
    }

    getCurrentPlayerIndex(): PlayerIndex
    {
        return this.currentPlayerIndex;
    }

    setCurrentPlayerIndex(currentPlayerIndex: PlayerIndex): void
    {
        this.currentPlayerIndex = currentPlayerIndex;
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

    getMovesHistory(): Move[]
    {
        return this.movesHistory;
    }

    setMovesHistory(movesHistory: Move[]): Game
    {
        this.movesHistory = movesHistory;

        return this;
    }

    getFirstMove(): null | Move
    {
        return this.movesHistory[0] ?? null;
    }

    getSecondMove(): null | Move
    {
        return this.movesHistory[1] ?? null;
    }

    getLastMove(): null | Move
    {
        if (0 === this.movesHistory.length) {
            return null;
        }

        return this.movesHistory[this.movesHistory.length - 1];
    }

    getLastMoveIndex(): number
    {
        return this.movesHistory.length - 1;
    }

    /**
     * Returns move history as "a1 swap-pieces b4 c5 ..."
     */
    getMovesHistoryAsString(): string
    {
        return Move.movesAsString(this.movesHistory);
    }

    /**
     * @throws IllegalMove on invalid move.
     */
    checkMove(move: Move, byPlayerIndex: PlayerIndex): void
    {
        if (this.isEnded()) {
            throw new IllegalMove(move, 'Game is finished');
        }

        if (!this.board.containsCoords(move.row, move.col)) {
            throw new IllegalMove(move, 'Cell outside board');
        }

        if (this.currentPlayerIndex !== byPlayerIndex) {
            throw new IllegalMove(move, 'Not your turn');
        }

        if (!this.board.isEmpty(move.row, move.col) && !this.isSwapPiecesMove(move, byPlayerIndex)) {
            throw new IllegalMove(move, 'This cell is already occupied');
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

        if (this.isSwapPiecesMove(move, byPlayerIndex)) {
            this.doSwapPieces(move, byPlayerIndex);
            return;
        }

        this.board.setCell(move.row, move.col, byPlayerIndex);

        this.movesHistory.push(move);
        this.lastMoveAt = new Date();

        // Naively check connection on every move played
        if (this.board.hasPlayerConnection(byPlayerIndex)) {
            this.setWinner(byPlayerIndex, null);
        } else {
            this.changeCurrentPlayer();
        }

        this.emit('played', move, this.movesHistory.length - 1, byPlayerIndex, this.getWinner());

        // Emit "ended" event after "played" event to keep order between events.
        if (this.hasWinner()) {
            this.emit('ended', this.getStrictWinner(), null);
        }
    }

    getAllowSwap(): boolean
    {
        return this.allowSwap;
    }

    setAllowSwap(allowSwap: boolean): void
    {
        this.allowSwap = allowSwap;
    }

    canSwapNow(): boolean
    {
        return this.allowSwap
            && 1 === this.movesHistory.length
        ;
    }

    /**
     * Whether a move is actually a swap-pieces move.
     */
    isSwapPiecesMove(move: Move, byPlayerIndex: PlayerIndex): boolean
    {
        return this.allowSwap
            && 1 === byPlayerIndex
            && this.movesHistory.length === 1
            && this.getBoard().getCell(move.row, move.col) === 0
        ;
    }

    /**
     * Whether last played move was actually a swap move.
     * Returns previous move and new move coords.
     */
    isLastMoveSwapPieces(): null | { swapped: Move, mirror: Move }
    {
        if (this.allowSwap
            && this.movesHistory.length === 2
            && this.movesHistory[0].hasSameCoordsAs(this.movesHistory[1])
        ) {
            const firstMove = this.getFirstMove() as Move;

            return {
                swapped: firstMove,
                mirror: firstMove.cloneMirror(),
            };
        }

        return null;
    }

    private doSwapPieces(move: Move, byPlayerIndex: PlayerIndex): void
    {
        const swappedMove = this.getFirstMove() as Move;
        const swappedMoveMirrored = swappedMove.cloneMirror();

        this.board.setCell(swappedMove.row, swappedMove.col, null);
        this.board.setCell(swappedMoveMirrored.row, swappedMoveMirrored.col, byPlayerIndex);

        this.movesHistory.push(move);
        this.lastMoveAt = new Date();

        this.changeCurrentPlayer();

        this.emit('played', move, this.movesHistory.length - 1, byPlayerIndex, this.getWinner());
    }

    hasWinner(): boolean
    {
        return null !== this.winner;
    }

    isEnded(): boolean
    {
        return null !== this.endedAt;
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

        if (this.isEnded()) {
            throw new Error('Cannot set a winner, game is already ended, probably canceled');
        }

        this.setWinner(playerIndex, outcome);

        this.emit('ended', playerIndex, outcome);
    }

    cancel(): void
    {
        if (this.isEnded()) {
            throw new Error('Cannot cancel, game already ended');
        }

        this.endedAt = new Date();

        this.emit('canceled');
    }

    isCanceled(): boolean
    {
        return this.isEnded() && null === this.winner;
    }

    getOutcome(): Outcome
    {
        return this.outcome;
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

    getStartedAt(): Date
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

    toData(): GameData
    {
        return {
            size: this.getSize(),
            movesHistory: this.movesHistory.map(move => move.toData()),
            allowSwap: this.allowSwap,
            currentPlayerIndex: this.currentPlayerIndex,
            winner: this.winner,
            outcome: this.outcome,
            startedAt: this.startedAt,
            lastMoveAt: this.lastMoveAt,
            endedAt: this.endedAt,
        };
    }

    static fromData(gameData: GameData): Game
    {
        const game = new Game(gameData.size);

        game.allowSwap = gameData.allowSwap;

        gameData.movesHistory.forEach((moveData, index) => {
            game.move(Move.fromData(moveData), index % 2 as PlayerIndex);
        });

        game.currentPlayerIndex = gameData.currentPlayerIndex;

        game.winner = gameData.winner;
        game.outcome = gameData.outcome;

        game.startedAt = gameData.startedAt;
        game.lastMoveAt = gameData.lastMoveAt;
        game.endedAt = gameData.endedAt;

        return game;
    }
}
