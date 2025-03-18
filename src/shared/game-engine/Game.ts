import { IllegalMove, PlayerIndex, Move, BOARD_DEFAULT_SIZE } from './index.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import Board from './Board.js';
import { Coords, Outcome } from './Types.js';
import { GameData } from './normalization.js';
import IllegalUndo from './IllegalUndo.js';

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
    undo: (undoneMoves: Move[]) => void;
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

        if (this.currentPlayerIndex !== byPlayerIndex) {
            throw new IllegalMove(move, 'Not your turn');
        }

        switch (move.getSpecialMoveType()) {
            case undefined:
                if (!this.board.containsCoords(move.row, move.col)) {
                    throw new IllegalMove(move, 'Cell outside board');
                }

                if (!this.board.isEmpty(move.row, move.col)) {
                    throw new IllegalMove(move, 'This cell is already occupied');
                }

                break;

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
                throw new IllegalMove(move, `Unknown move special type: "${move.getSpecialMoveType()}"`);
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

        switch (move.getSpecialMoveType()) {
            case 'swap-pieces': {
                const swapCoords = this.getSwapCoords(false)!;
                const { swapped, mirror } = swapCoords;

                this.board.setCell(swapped.row, swapped.col, null);
                this.board.setCell(mirror.row, mirror.col, byPlayerIndex);
                break;
            }

            case undefined:
                this.board.setCell(move.row, move.col, byPlayerIndex);
                break;

            case 'pass':
                break;

            default:
                throw new IllegalMove(move, `Unknown move special type: "${move.getSpecialMoveType()}"`);
        }

        this.movesHistory.push(move);
        this.lastMoveAt = move.getPlayedAt();

        // Naively check connection on every move played
        if (this.board.hasPlayerConnection(byPlayerIndex)) {
            this.setWinner(byPlayerIndex, null, move.getPlayedAt());
        } else {
            this.changeCurrentPlayer();
        }

        this.emit('played', move, this.movesHistory.length - 1, byPlayerIndex, this.getWinner());

        // Emit "ended" event after "played" event to keep order between events.
        if (this.hasWinner()) {
            if (null === this.endedAt) {
                throw new Error('Ended at expected to be set');
            }

            this.emit('ended', this.getStrictWinner(), null, this.endedAt);
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
            && 'pass' !== this.movesHistory[0].getSpecialMoveType()
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

        return 'swap-pieces' === this.movesHistory[1].getSpecialMoveType();
    }

    createMoveOrSwapMove(coords: Coords): Move
    {
        if (this.canSwapNow() && this.board.getCell(coords.row, coords.col) === 0) {
            return Move.swapPieces();
        }

        return new Move(coords.row, coords.col);
    }

    /**
     * Returns previous move and new move coords.
     */
    getSwapCoords(checkIsSwap = true): null | { swapped: Coords, mirror: Coords }
    {
        if (checkIsSwap && ('swap-pieces' !== this.getLastMove()?.getSpecialMoveType())) {
            return null;
        }

        const firstMove = this.getFirstMove();

        if (!firstMove) {
            return null;
        }

        return {
            swapped: firstMove,
            mirror: firstMove.cloneMirror(),
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

        if (this.movesHistory.length < 2 && 1 === playerIndex) {
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

    private doUndoMove(): Move
    {
        const lastMove = this.getLastMove();

        if (null === lastMove) {
            throw new Error('Cannot undo, board is empty');
        }

        switch (lastMove.getSpecialMoveType()) {
            case undefined:
                this.board.setCell(lastMove.row, lastMove.col, null);
                break;

            case 'swap-pieces': {
                const firstMove = this.getFirstMove();

                if (null === firstMove) {
                    throw new Error('Unexpected null first move');
                }

                this.board.setCell(firstMove.col, firstMove.row, null);
                this.board.setCell(firstMove.row, firstMove.col, 0);
                break;
            }
        }

        this.changeCurrentPlayer();

        return this.movesHistory.pop()!;
    }

    undoMove(): Move
    {
        const undoneMove = this.doUndoMove();

        this.emit('undo', [undoneMove]);

        return undoneMove;
    }

    /**
     * player undo, moves are undone until it is player's turn again.
     * So 1 move is undone, or 2 if opponent played, his last move is also undone.
     */
    playerUndo(playerIndex: PlayerIndex): Move[]
    {
        const undoneMoves = [];

        if (this.movesHistory.length < 2 && 1 === playerIndex) {
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
    playerUndoDryRun(playerIndex: PlayerIndex): Move[]
    {
        const undoneMoves: Move[] = [];

        if (this.movesHistory.length < 2 && 1 === playerIndex) {
            return undoneMoves;
        }

        undoneMoves.push(this.movesHistory[this.movesHistory.length - 1]);

        if (((this.movesHistory.length - 1) % 2) !== playerIndex) {
            undoneMoves.push(this.movesHistory[this.movesHistory.length - 2]);
        }

        return undoneMoves;
    }

    pass(byPlayerIndex: PlayerIndex): Move
    {
        const passMove = Move.pass();

        this.move(passMove, byPlayerIndex);

        return passMove;
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
    private setWinner(playerIndex: PlayerIndex, outcome: Outcome = null, date: Date): void
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
        if (null !== this.winner) {
            throw new Error('Cannot set a winner again, there is already a winner');
        }

        if (this.isEnded()) {
            throw new Error('Cannot set a winner, game is already ended, probably canceled');
        }

        this.setWinner(playerIndex, outcome, date);

        this.emit('ended', playerIndex, outcome, date);
    }

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
        return this.isEnded() && null === this.winner;
    }

    getOutcome(): Outcome
    {
        return this.outcome;
    }

    /**
     * Makes playerIndex resign
     */
    resign(playerIndex: PlayerIndex, date: Date): void
    {
        this.declareWinner(0 === playerIndex ? 1 : 0, 'resign', date);
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

    updateFromData(gameData: GameData) {
        const lastMove = this.getLastMove();
        let found = lastMove == null;
        // Update move history only from the last move that we have (or from
        // the beginning if lastMove is null)
        let i = this.movesHistory.length;
        for (const moveData of gameData.movesHistory) {
            if (!found) {
                if (moveData.col === lastMove!.col && moveData.row === lastMove!.row)
                    found = true;
                continue;
            }
            this.move(Move.fromData(moveData), i % 2 as PlayerIndex);
            i++;
        }

        this.currentPlayerIndex = gameData.currentPlayerIndex;
        this.startedAt = gameData.startedAt;
        this.lastMoveAt = gameData.lastMoveAt;

        if (this.endedAt == null && this.winner == null && gameData.endedAt != null && gameData.winner != null) {
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
