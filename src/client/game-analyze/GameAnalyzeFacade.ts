import { GameAnalyzeData, GameAnalyzeMoveMcts } from '../../shared/app/models/GameAnalyze.js';
import { GameView } from '@playhex/pixi-board';
import { BestMoveMark } from './BestMoveMark.js';
import { PlayedMoveMark } from './PlayedMoveMark.js';
import { type HexMove, Move, parseMove, validateMove } from '@playhex/move-notation';

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
 * Move analyze to display: deep analyze (tree search) if any, else intuition.
 */
export const preferMctsAnalyze = (moveAnalyze: undefined | GameAnalyzeData[number]): null | (AnalyzeMoveOutput & { mcts?: GameAnalyzeMoveMcts }) => {
    if (!moveAnalyze) {
        return null;
    }

    if (!moveAnalyze.mcts) {
        return moveAnalyze;
    }

    const { whiteWin, move, bestMoves } = moveAnalyze.mcts;

    return { ...moveAnalyze, whiteWin, move, bestMoves };
};

/**
 * Best moves with a policy above this ratio of the max policy are displayed too.
 */
const SIMILAR_POLICY_RATIO = 0.8;

/**
 * Max number of best moves marks that can be displayed at once.
 */
const MAX_BEST_MOVE_MARKS = 4;

/**
 * Best moves with a policy close to the best one (max policy among best moves).
 * First best move is always included.
 */
export const getSimilarBestMoves = (bestMoves: MoveAndValue[]): MoveAndValue[] => {
    const maxValue = Math.max(...bestMoves.map(bestMove => bestMove.value));

    return bestMoves.filter((bestMove, i) => i === 0 || bestMove.value > maxValue * SIMILAR_POLICY_RATIO);
};

/**
 * Facade for showing analysis marks on a game view.
 * Displays best moves and played move marks, and navigates to the analyzed position.
 */
export class GameAnalyzeFacade
{
    private bestMoveMarks: BestMoveMark[] = Array.from({ length: MAX_BEST_MOVE_MARKS }, () => new BestMoveMark());
    private playedMoveMark = new PlayedMoveMark();
    private currentlyFaded: null | Move = null;
    private selectedMoveIndex: null | number = null;

    constructor(
        private gameView: GameView,
        private getAnalyze: () => GameAnalyzeData,
        private showPositionAt: (index: number) => void,
    ) {
        this.playedMoveMark.hide();
        gameView.addEntity(this.playedMoveMark, 'analyze');

        for (const bestMoveMark of this.bestMoveMarks) {
            bestMoveMark.hide();
            gameView.addEntity(bestMoveMark, 'analyze');
        }
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

        // Place best moves, and other moves with similar policy
        getSimilarBestMoves(move.bestMoves)
            .slice(0, MAX_BEST_MOVE_MARKS)
            .forEach(({ move: bestMove }, i) => {
                if (!validateMove(bestMove)) {
                    return;
                }

                this.bestMoveMarks[i].setCoords(parseMove(bestMove));
                this.bestMoveMarks[i].show();
            })
        ;

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
        this.showAnalysisMarks(preferMctsAnalyze(this.getAnalyze()[moveIndex]));
    }

    hideCurrentAnalysisMarks(): void
    {
        for (const bestMoveMark of this.bestMoveMarks) {
            bestMoveMark.hide();
        }

        this.playedMoveMark.hide();
        this.removeFadedPlayedMove();
    }

    showCurrentAnalysisMarks(): void
    {
        if (this.selectedMoveIndex !== null) {
            this.showAnalysisMarks(preferMctsAnalyze(this.getAnalyze()[this.selectedMoveIndex]));
        }
    }
}
