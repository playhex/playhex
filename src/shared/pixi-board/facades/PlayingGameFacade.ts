import { mirrorMove } from '../../move-notation/move-notation.js';
import { HexMove, isSpecialHexMove } from '../../move-notation/hex-move-notation.js';
import GameView from '../GameView.js';
import { GameMarksFacade } from './GameMarksFacade.js';

/**
 * Facade for adding moves alternately.
 * Add move, undo, show last move, swappable and swapped marks.
 */
export class PlayingGameFacade
{
    private gameMarksFacade: GameMarksFacade;

    /**
     * Already occupied cells.
     * Used to quickly check if a cell is empty.
     */
    private placedStones: { [move: string]: 0 | 1 } = {};

    /**
     * Moves history
     */
    private moves: HexMove[] = [];

    /**
     * List of callbacks to call when view is resumed
     * to re-sync view with state.
     *
     * If null, view is not paused.
     */
    private actionsWhilePaused: null | (() => void)[] = null;

    constructor(
        private gameView: GameView,
        private swapAllowed: boolean,
        initialMoves: HexMove[] = [],
    ) {
        this.gameMarksFacade = new GameMarksFacade(gameView);

        for (const move of initialMoves) {
            this.addMove(move);
        }

        this.markLastMove();
    }

    getGameView(): GameView
    {
        return this.gameView;
    }

    getSwapAllowed(): boolean
    {
        return this.swapAllowed;
    }

    getMoves(): HexMove[]
    {
        return this.moves;
    }

    getLastMove(): null | HexMove
    {
        if (this.moves.length === 0) {
            return null;
        }

        return this.moves[this.moves.length - 1];
    }

    setLastMoveMarksVisible(visible = true): void
    {
        this.gameMarksFacade.setVisible(visible);
    }

    /**
     * Play a move.
     *
     * @returns Whether move has been played, false if cell was already occupied.
     *
     * @throws When provided move is a bad value
     */
    addMove(move: HexMove): boolean
    {
        if (this.moves.length === 1
            && this.swapAllowed
            && move === this.moves[0]
            && move !== 'pass'
        ) {
            move = 'swap-pieces';
        }

        if (move === 'swap-pieces') {
            if (this.moves.length !== 1) {
                throw new Error('Cannot swap-pieces now, can only swap on move 2');
            }

            const firstMove = this.moves[0];

            if (isSpecialHexMove(firstMove)) {
                throw new Error('Cannot swap a special move');
            }

            const mirror = mirrorMove(firstMove);
            this.moves.push(move);
            this.placedStones = {};
            this.placedStones[mirror] = 1;

            this.doOrDeferViewUpdate(() => {
                this.gameView.setStone(firstMove, null);
                this.gameView.setStone(mirror, 1);
                this.markLastMove();
            });

            return true;
        }

        if (move === 'pass') {
            this.moves.push(move);

            this.doOrDeferViewUpdate(() => {
                this.gameMarksFacade.hideMarks();
            });

            return true;
        }

        if (this.placedStones[move] !== undefined) {
            return false;
        }

        const playerIndex: 0 | 1 = this.moves.length % 2 as 0 | 1;
        this.placedStones[move] = playerIndex;
        this.moves.push(move);

        this.doOrDeferViewUpdate(() => {
            this.gameView.setStone(move, playerIndex);
            this.markLastMove();
        });

        return true;
    }

    addMoves(moves: HexMove[]): boolean
    {
        for (const move of moves) {
            const added = this.addMove(move);

            if (!added) {
                return false;
            }
        }

        return true;
    }

    /**
     * Undo last move, remove stone, and show update last move mark.
     * In case of swap-piece undone, mirrors move back.
     */
    undoLastMove(): null | HexMove
    {
        const undoneMove = this.moves.pop();

        if (!undoneMove) {
            return null;
        }

        switch (undoneMove) {
            case 'pass':
                break;

            case 'swap-pieces':
                const swapped = this.moves[0];

                if (isSpecialHexMove(swapped)) {
                    throw new Error('Unexpected special move as first move');
                }

                const mirror = mirrorMove(swapped);

                delete this.placedStones[mirror];
                this.placedStones[swapped] = 0;

                this.doOrDeferViewUpdate(() => {
                    this.gameView.setStone(mirror, null);
                    this.gameView.setStone(swapped, 0);
                });

                break;

            default:
                delete this.placedStones[undoneMove];

                this.doOrDeferViewUpdate(() => {
                    this.gameView.setStone(undoneMove, null);
                });
        }

        this.doOrDeferViewUpdate(() => {
            this.markLastMove();
        });

        return undoneMove;
    }

    undoAllMoves(): void
    {
        while (this.moves.length) {
            this.undoLastMove();
        }
    }

    /**
     * Mark last move (and remove other mark if any)
     * given current moves history.
     */
    private markLastMove(): void
    {
        this.gameMarksFacade.hideMarks();

        const lastMove = this.moves[this.moves.length - 1];

        if (!lastMove) {
            return;
        }

        if (lastMove === 'pass') {
            return;
        }

        const firstMove = this.moves[0];

        if (isSpecialHexMove(firstMove)) {
            throw new Error('Unexpected special move as first move');
        }

        if (lastMove === 'swap-pieces') {
            const swappedCoords = mirrorMove(firstMove);

            this.gameMarksFacade.markSwapped(swappedCoords);
            return;
        }

        if (this.moves.length === 1 && this.swapAllowed) {
            this.gameMarksFacade.markSwappable(lastMove);
            return;
        }

        this.gameMarksFacade.markLastMove(lastMove);
    }

    isViewPaused(): boolean
    {
        return this.actionsWhilePaused !== null;
    }

    /**
     * Pauses the view so addMove won't add the stone visually until we resume the view.
     *
     * Used to do simulation.
     */
    pauseView(): void
    {
        if (this.actionsWhilePaused !== null) {
            throw new Error('Cannot freeze, already frozen.');
        }

        this.actionsWhilePaused = [];
    }

    resumeView(): void
    {
        if (this.actionsWhilePaused === null) {
            return;
        }

        for (const action of this.actionsWhilePaused) {
            action();
        }

        this.actionsWhilePaused = null;
    }

    /**
     * Just call the callback,
     * or if view is paused, call it when we resume.
     */
    private doOrDeferViewUpdate(viewUpdate: () => void): void
    {
        if (this.actionsWhilePaused === null) {
            viewUpdate();
        } else {
            this.actionsWhilePaused.push(viewUpdate);
        }
    }

    destroy(): void
    {
        this.gameMarksFacade.hideMarks();
    }
}
