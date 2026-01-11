import { IllegalMove, PlayerIndex, BOARD_DEFAULT_SIZE } from './index.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import Board from './Board.js';
import { TimestampedMove, Outcome } from './Types.js';
import { GameData } from './normalization.js';
import IllegalUndo from './errors/IllegalUndo.js';
import NotYourTurnError from './errors/NotYourTurnError.js';
import CellAlreadyOccupiedError from './errors/CellAlreadyOccupiedError.js';
import { mirrorMove, Move } from '../move-notation/move-notation.js';

type GameEvents = {
    /**
     * A move have been played by a player. PlayerIndex is the player who made the move.
     * At this time, game.getCurrentPlayer() is the current player after move have been played.
     * If the move is winning, "winner" contains the actual winner. Otherwise contains null.
     */
    played: (move: TimestampedMove, moveIndex: number, byPlayerIndex: PlayerIndex, winner: null | PlayerIndex) => void;

    /**
     * Game have been finished.
     */
    ended: (winner: PlayerIndex, outcome: Outcome, date: Date) => void;

    /**
     * Game has been canceled, so game is over, but no winner.
     */
    canceled: (date: Date) => void;

    /**
     * Moves have been undone.
     *
     * @param undoneMoves List of moves that have been undone.
     *                    First one is the first undone, so the latest played one.
     *                    So A, B, C, undone 2 moves will make: [C, B]
     */
    undo: (undoneMoves: TimestampedMove[]) => void;

    /**
     * Board has been updated in a non-usually way,
     * like board has been empty, or set manually.
     */
    updated: () => void;
};

export default class Game extends TypedEmitter<GameEvents>
{
    private board: Board;
    private currentPlayerIndex: PlayerIndex = 0;
    private movesHistory: TimestampedMove[] = [];
    private allowSwap = true;

    private winner: null | PlayerIndex = null;
    private outcome: null | Outcome = null;

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
        return this.currentPlayerIndex === 0
            ? 1
            : 0
        ;
    }

    private changeCurrentPlayer(): void
    {
        this.currentPlayerIndex = this.otherPlayerIndex();
    }

    getMovesHistory(): TimestampedMove[]
    {
        return this.movesHistory;
    }

    setMovesHistory(movesHistory: TimestampedMove[]): Game
    {
        this.movesHistory = movesHistory;

        return this;
    }

    resetGame(): void
    {
        for (const move of this.movesHistory) {
            this.board.setCell(move.move, null);
        }

        this.movesHistory = [];
        this.winner = null;
        this.outcome = null;
        this.lastMoveAt = null;
        this.endedAt = null;

        this.emit('updated');
    }

    getFirstMove(): null | TimestampedMove
    {
        return this.movesHistory[0] ?? null;
    }

    getSecondMove(): null | TimestampedMove
    {
        return this.movesHistory[1] ?? null;
    }

    getLastMove(): null | TimestampedMove
    {
        if (this.movesHistory.length === 0) {
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
        return this.movesHistory.map(move => move.move).join(' ');
    }

    /**
     * @throws IllegalMove on invalid move.
     */
    checkMove(move: Move, byPlayerIndex: PlayerIndex): void
    {
        if (this.isEnded()) {
            throw new IllegalMove(move, 'Game is finished');
        }

        if (this.currentPlayerIndex !== byPlayerIndex) {
            throw new NotYourTurnError(move);
        }

        switch (move) {
            case 'swap-pieces':
                if (!this.allowSwap) {
                    throw new IllegalMove(move, 'Cannot swap, swap rule is disabled');
                }

                if (!this.canSwapNow()) {
                    throw new IllegalMove(move, 'Cannot swap now');
                }

                break;

            case 'pass':
                break;

            default:
                if (!this.board.containsMove(move)) {
                    throw new IllegalMove(move, 'Cell outside board');
                }

                if (!this.board.isEmpty(move)) {
                    throw new CellAlreadyOccupiedError(move);
                }

                break;
        }
    }

    /**
     * Validate and make current play move, and change player.
     *
     * @throws IllegalMove on invalid move.
     */
    move(move: Move, byPlayerIndex: PlayerIndex, playedAt = new Date()): void
    {
        this.checkMove(move, byPlayerIndex);

        switch (move) {
            case 'swap-pieces': {
                const { swapped, mirror } = this.getSwapCoords(false)!;

                this.board.setCell(swapped, null);
                this.board.setCell(mirror, byPlayerIndex);
                break;
            }

            case 'pass':
                break;

            default:
                this.board.setCell(move, byPlayerIndex);
                break;
        }

        const timestampedMove: TimestampedMove = {
            move,
            playedAt,
        };

        this.movesHistory.push(timestampedMove);
        this.lastMoveAt = timestampedMove.playedAt;

        // Naively check connection on every move played
        if (this.board.hasPlayerConnection(byPlayerIndex)) {
            this.setWinner(byPlayerIndex, 'path', timestampedMove.playedAt);
        } else {
            this.changeCurrentPlayer();
        }

        this.emit('played', timestampedMove, this.movesHistory.length - 1, byPlayerIndex, this.getWinner());

        // Emit "ended" event after "played" event to keep order between events.
        if (this.hasWinner()) {
            if (this.endedAt === null) {
                throw new Error('endedAt expected to be not null');
            }

            this.emit('ended', this.getStrictWinner(), 'path', this.endedAt);
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
            && this.movesHistory.length === 1
            && this.movesHistory[0].move !== 'pass'
        ;
    }

    /**
     * Returns whether there is a swap move in this game history
     */
    hasSwapped(): boolean
    {
        if (this.movesHistory.length < 2) {
            return false;
        }

        return this.movesHistory[1].move === 'swap-pieces';
    }

    /**
     * Returns swap-pieces instead of move
     * if trying to play over red's first move.
     */
    moveOrSwapPieces(move: Move): Move
    {
        if (this.canSwapNow() && this.board.getCell(move) === 0) {
            return 'swap-pieces';
        }

        return move;
    }

    /**
     * Returns previous move and new move coords.
     */
    getSwapCoords(checkIsSwap = true): null | { swapped: Move, mirror: Move }
    {
        const lastMove = this.getLastMove();

        if (lastMove === null) {
            return null;
        }

        if (checkIsSwap && (lastMove.move !== 'swap-pieces')) {
            return null;
        }

        const firstMove = this.getFirstMove();

        if (!firstMove) {
            return null;
        }

        return {
            swapped: firstMove.move,
            mirror: mirrorMove(firstMove.move),
        };
    }

    /**
     * @param playerIndex Player who ask for undo
     *
     * @throws {IllegalUndo} If not possible to undo with the reason
     */
    checkPlayerUndo(playerIndex: PlayerIndex): void
    {
        if (this.isEnded()) {
            throw new IllegalUndo('Game is finished');
        }

        if (this.movesHistory.length < 1) {
            throw new IllegalUndo('Cannot undo, no move to undo yet');
        }

        if (this.movesHistory.length < 2 && playerIndex === 1) {
            throw new IllegalUndo('Second player cannot undo his move because he has not played any move yet');
        }
    }

    canPlayerUndo(playerIndex: PlayerIndex): true | string
    {
        try {
            this.checkPlayerUndo(playerIndex);

            return true;
        } catch (e) {
            if (e instanceof IllegalUndo) {
                return e.message;
            }

            throw e;
        }
    }

    private doUndoMove(): TimestampedMove
    {
        const lastMove = this.getLastMove();

        if (lastMove === null) {
            throw new Error('Cannot undo, board is empty');
        }

        switch (lastMove.move) {
            case 'swap-pieces': {
                const firstMove = this.getFirstMove();

                if (firstMove === null) {
                    throw new Error('Unexpected null first move');
                }

                this.board.setCell(mirrorMove(firstMove.move), null);
                this.board.setCell(firstMove.move, 0);
                break;
            }

            case 'pass':
                break;

            default:
                this.board.setCell(lastMove.move, null);
        }

        this.changeCurrentPlayer();

        return this.movesHistory.pop()!;
    }

    undoMove(): TimestampedMove
    {
        const undoneMove = this.doUndoMove();

        this.emit('undo', [undoneMove]);

        return undoneMove;
    }

    /**
     * player undo, moves are undone until it is player's turn again.
     * So 1 move is undone, or 2 if opponent played, his last move is also undone.
     */
    playerUndo(playerIndex: PlayerIndex): TimestampedMove[]
    {
        const undoneMoves = [];

        if (this.movesHistory.length < 2 && playerIndex === 1) {
            throw new Error('player 1 cannot undo, player 1 has not played yet');
        }

        undoneMoves.push(this.doUndoMove());

        if (this.currentPlayerIndex !== playerIndex) {
            undoneMoves.push(this.doUndoMove());
        }

        this.emit('undo', undoneMoves);

        return undoneMoves;
    }

    /**
     * Returns moves that will be undone if we call playerUndo()
     */
    playerUndoDryRun(playerIndex: PlayerIndex): TimestampedMove[]
    {
        const undoneMoves: TimestampedMove[] = [];

        if (this.movesHistory.length < 2 && playerIndex === 1) {
            return undoneMoves;
        }

        undoneMoves.push(this.movesHistory[this.movesHistory.length - 1]);

        if (((this.movesHistory.length - 1) % 2) !== playerIndex) {
            undoneMoves.push(this.movesHistory[this.movesHistory.length - 2]);
        }

        return undoneMoves;
    }

    pass(byPlayerIndex: PlayerIndex): void
    {
        this.move('pass', byPlayerIndex);
    }

    hasWinner(): boolean
    {
        return this.winner !== null;
    }

    isEnded(): boolean
    {
        return this.endedAt !== null;
    }

    getWinner(): null | PlayerIndex
    {
        return this.winner;
    }

    getStrictWinner(): PlayerIndex
    {
        if (this.winner === null) {
            throw new Error('Trying to strictly get the winner but game not finished or canceled');
        }

        return this.winner;
    }

    /**
     * Just update properties, do not emit "ended" event.
     * Should be emitted manually.
     */
    private setWinner(playerIndex: PlayerIndex, outcome: Outcome, date: Date): void
    {
        this.winner = playerIndex;
        this.outcome = outcome;
        this.endedAt = date;
    }

    /**
     * Change game state by setting a winner and emitting "ended" event.
     */
    declareWinner(playerIndex: PlayerIndex, outcome: Outcome, date: Date): void
    {
        if (this.winner !== null) {
            throw new Error('Cannot set a winner again, there is already a winner');
        }

        if (this.isEnded()) {
            throw new Error('Cannot set a winner, game is already ended, probably canceled');
        }

        this.setWinner(playerIndex, outcome, date);

        this.emit('ended', playerIndex, outcome, date);
    }

    /**
     * @param date At which date exactly the game has been canceled.
     *
     * @throws {Error} If game is already ended (or already canceled).
     */
    cancel(date: Date): void
    {
        if (this.isEnded()) {
            throw new Error('Cannot cancel, game already ended');
        }

        this.endedAt = date;

        this.emit('canceled', date);
    }

    isCanceled(): boolean
    {
        return this.isEnded() && this.winner === null;
    }

    getOutcome(): null | Outcome
    {
        return this.outcome;
    }

    /**
     * Makes playerIndex resign
     */
    resign(playerIndex: PlayerIndex, date: Date): void
    {
        this.declareWinner(playerIndex === 0 ? 1 : 0, 'resign', date);
    }

    /**
     * Makes playerIndex forfeit
     */
    forfeit(playerIndex: PlayerIndex, date: Date): void
    {
        this.declareWinner(playerIndex === 0 ? 1 : 0, 'forfeit', date);
    }

    /**
     * Makes current player lose on time
     */
    loseByTime(date: Date): void
    {
        this.declareWinner(this.otherPlayerIndex(), 'time', date);
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
            movesHistory: this.movesHistory,
            allowSwap: this.allowSwap,
            currentPlayerIndex: this.currentPlayerIndex,
            winner: this.winner,
            outcome: this.outcome,
            startedAt: this.startedAt,
            lastMoveAt: this.lastMoveAt,
            endedAt: this.endedAt,
        };
    }

    updateFromData(gameData: GameData) {
        const lastMove = this.getLastMove();
        let found = lastMove == null;
        // Update move history only from the last move that we have (or from
        // the beginning if lastMove is null)
        let i = this.movesHistory.length;
        for (const moveData of gameData.movesHistory) {
            if (!found) {
                if (moveData.move === lastMove!.move)
                    found = true;
                continue;
            }
            this.move(moveData.move, i % 2 as PlayerIndex, moveData.playedAt);
            i++;
        }

        this.currentPlayerIndex = gameData.currentPlayerIndex;
        this.startedAt = gameData.startedAt;
        this.lastMoveAt = gameData.lastMoveAt;

        if (this.endedAt == null && this.winner == null && gameData.endedAt != null && gameData.winner != null) {
            if (gameData.outcome === null) {
                throw new Error('Game ended, but gameData.outcome is null');
            }

            this.declareWinner(gameData.winner, gameData.outcome, gameData.endedAt);
        } else {
            this.winner = gameData.winner;
            this.outcome = gameData.outcome;
            this.endedAt = gameData.endedAt;
        }
    }

    static fromData(gameData: GameData): Game
    {
        const game = new Game(gameData.size);

        game.allowSwap = gameData.allowSwap;

        gameData.movesHistory.forEach((moveData, index) => {
            game.move(moveData.move, index % 2 as PlayerIndex, moveData.playedAt);
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
