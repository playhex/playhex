import { GameAnalyzeData } from '../../shared/app/models/GameAnalyze.js';
import GameView from '../../shared/pixi-board/GameView.js';
import { BestMoveMark } from './BestMoveMark.js';
import { PlayedMoveMark } from './PlayedMoveMark.js';
import { validateMove, parseMove, Move } from '../../shared/move-notation/move-notation.js';
import type { HexMove } from '../../shared/move-notation/hex-move-notation.js';

export type MoveAndValue = {
    move: HexMove;
    value: number;
    whiteWin?: number;
};

export type AnalyzeMoveOutput = {
    moveIndex: number;
    color: 'black' | 'white';
    move: MoveAndValue;
    bestMoves: MoveAndValue[];
    whiteWin: number;
};

/**
 * Facade for showing analysis marks on a game view.
 * Displays best move and played move marks, and navigates to the analyzed position.
 */
export class GameAnalyzeFacade
{
    private bestMoveMark = new BestMoveMark();
    private playedMoveMark = new PlayedMoveMark();
    private currentlyFaded: null | Move = null;
    private selectedMoveIndex: null | number = null;

    constructor(
        private gameView: GameView,
        private analyze: GameAnalyzeData,
        private showPositionAt: (index: number) => void,
    ) {
        this.playedMoveMark.hide();
        this.bestMoveMark.hide();
        gameView.addEntity(this.playedMoveMark, 'analyze');
        gameView.addEntity(this.bestMoveMark, 'analyze');
    }

    getGameView(): GameView
    {
        return this.gameView;
    }

    private fadePlayedMove(move: Move, byPlayerIndex: 0 | 1): void
    {
        this.removeFadedPlayedMove();

        this.currentlyFaded = move;
        this.gameView.setStone(this.currentlyFaded, byPlayerIndex, true);
    }

    private removeFadedPlayedMove(): void
    {
        if (this.currentlyFaded && this.gameView.getStone(this.currentlyFaded)?.isFaded()) {
            this.gameView.setStone(this.currentlyFaded, null);
            this.currentlyFaded = null;
        }
    }

    showAnalysisMarks(move: null | AnalyzeMoveOutput): void
    {
        this.hideCurrentAnalysisMarks();

        if (move === null) {
            return;
        }

        this.showPositionAt(move.moveIndex);

        // Place best move
        if (validateMove(move.bestMoves[0].move)) {
            this.bestMoveMark.setCoords(parseMove(move.bestMoves[0].move));
            this.bestMoveMark.show();
        }

        // Place played move and eval color
        if (!validateMove(move.move.move)) {
            return;
        }

        this.fadePlayedMove(move.move.move, move.color === 'black' ? 0 : 1);
        this.playedMoveMark.setCoords(parseMove(move.move.move));

        const playedWhiteWin = move.move.whiteWin;
        const bestWhiteWin = move.bestMoves[0].whiteWin;

        if (undefined !== playedWhiteWin && undefined !== bestWhiteWin) {
            let diff = playedWhiteWin - bestWhiteWin;
            diff *= 2; // drop 50% means full red

            // Oppose value every two move, as it is whiteWin
            if (move.moveIndex % 2) {
                diff = -diff;
            }

            // Can be negative when player found a better move than cpu best move
            if (diff < 0) {
                diff = 0;
            }

            // Can be >1 when big mistake, because we multiply the diff
            if (diff > 1) {
                diff = 1;
            }

            this.playedMoveMark.setWhiteWinDiff(diff);
        } else {
            this.playedMoveMark.setWhiteWinDiff(0);
        }

        this.playedMoveMark.show();
    }

    selectMove(moveIndex: number): void
    {
        if (this.selectedMoveIndex === moveIndex) {
            return;
        }

        this.selectedMoveIndex = moveIndex;
        this.showAnalysisMarks(this.analyze[moveIndex] ?? null);
    }

    hideCurrentAnalysisMarks(): void
    {
        this.bestMoveMark.hide();
        this.playedMoveMark.hide();
        this.removeFadedPlayedMove();
    }

    showCurrentAnalysisMarks(): void
    {
        if (this.selectedMoveIndex !== null) {
            this.showAnalysisMarks(this.analyze[this.selectedMoveIndex] ?? null);
        }
    }
}
