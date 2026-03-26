import { PlayingGameFacade } from '../facades/PlayingGameFacade.js';
import ConditionalMovesEditor from './ConditionalMovesEditor.js';
import { Move, parseMove } from '../../move-notation/move-notation.js';
import type { HexMove } from '../../move-notation/hex-move-notation.js';
import { getNextMovesAfterLine } from './conditionalMovesUtils.js';
import TextMark from '../entities/TextMark.js';
import GameView from '../GameView.js';
import { on } from '../../app/utils.js';

const ENTITIES_GROUP_CONDITIONAL_MOVES = 'entities_group_conditional_moves';

export class ConditionalMovesFacade
{
    /**
     * Moves in real game.
     * Not touched, used to know from which position we start.
     */
    private mainLine: HexMove[];

    /**
     * Another playing game facade used for simulation, not paused.
     */
    private playingGameFacade: PlayingGameFacade;

    private gameView: GameView;

    private onDestroy: (() => void)[] = [];

    constructor(
        private initialPlayingGameFacade: PlayingGameFacade,
        private editor: ConditionalMovesEditor,
    ) {
        this.mainLine = [...initialPlayingGameFacade.getMoves()];
        this.gameView = initialPlayingGameFacade.getGameView();

        this.playingGameFacade = new PlayingGameFacade(
            this.gameView,
            initialPlayingGameFacade.getSwapAllowed(),
            this.mainLine,
            false,
        );

        // Make next conditional move always opponent move
        if (this.editor.getMyIndex() === this.playingGameFacade.getCurrentPlayerIndex()) {
            this.playingGameFacade.addMove('pass');
            this.mainLine.push('pass');
        }

        this.initialPlayingGameFacade.pauseView();
        this.markNextConditionalMoves();

        this.onDestroy.push(
            on(editor, 'conditionalMovesSubmitted', () => {
                this.markNextConditionalMoves();
            }),
            on(editor, 'selectedLineMoveAdded', (move: Move) => {
                this.playingGameFacade.addMove(move);
                this.markNextConditionalMoves();
            }),
            on(editor, 'selectedLineRewinded', (removedMoves: Move[]) => {
                this.rewind(removedMoves.length);
                this.markNextConditionalMoves();
            }),
            on(editor, 'selectedLineReplaced', (line: HexMove[]) => {
                this.rewindAll();
                this.playingGameFacade.addMoves(line);
                this.markNextConditionalMoves();
            }),
        );
    }

    getEditor()
    {
        return this.editor;
    }

    /**
     * Rewind simulated moves.
     * Cannot rewind more, in main line.
     */
    private rewind(n: number): void
    {
        for (let i = 0; i < n && this.playingGameFacade.getMoves().length > this.mainLine.length; ++i) {
            this.playingGameFacade.undoLastMove();
        }
    }

    private rewindAll(): void
    {
        while (this.playingGameFacade.getMoves().length > this.mainLine.length) {
            this.playingGameFacade.undoLastMove();
        }
    }

    private unmarksNextConditionalMoves(): void
    {
        this.gameView.removeEntitiesGroup(ENTITIES_GROUP_CONDITIONAL_MOVES);
    }

    /**
     * Adds number on next cells where there are conditional moves.
     * Used to help seeing lines we have programmed.
     */
    private markNextConditionalMoves(): void
    {
        this.unmarksNextConditionalMoves();

        const selectedLine = this.editor.getSelectedLine();

        // add 1 2 3 4... on current line
        for (let i = 0; i < selectedLine.length; ++i) {
            const mark = new TextMark('' + (i + 1)).setCoords(parseMove(selectedLine[i]));
            this.gameView.addEntity(mark, ENTITIES_GROUP_CONDITIONAL_MOVES);
        }

        // add 5 5 5... on every next moves that are already planned
        const next = getNextMovesAfterLine(this.editor.getConditionalMovesDirty().tree, selectedLine);
        const nextNumberString = '' + (selectedLine.length + 1);

        for (const move of next) {
            const mark = new TextMark(nextNumberString).setCoords(parseMove(move));
            this.gameView.addEntity(mark, ENTITIES_GROUP_CONDITIONAL_MOVES);
        }
    }

    /**
     * Should be called when cell was clicked.
     * Will add a conditional move in current line,
     * or go to a previous/next state when clicking on a move already in lines.
     */
    clickCell(move: Move): void
    {
        if (this.initialPlayingGameFacade.getStoneAt(move) !== null) {
            return;
        }

        this.editor.autoAction(move);
        this.markNextConditionalMoves();
    }

    destroy(): void
    {
        this.editor.discardSimulationMoves();
        this.initialPlayingGameFacade.resumeView();
        this.playingGameFacade.destroy();
        this.unmarksNextConditionalMoves();

        for (const callback of this.onDestroy) {
            callback();
        }
    }
}
