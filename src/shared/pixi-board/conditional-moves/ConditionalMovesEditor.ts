import { TypedEmitter } from 'tiny-typed-emitter';
import { clearDuplicatedUnplayedLines, conditionalMovesCut, conditionalMovesMergeMoves, conditionalMovesShift, copyConditionalMovesStruct } from './conditionalMovesUtils.js';
import { Move } from '../../move-notation/move-notation.js';
import { ConditionalMovesStruct } from './types.js';
import { ConditionalMovesEditorState } from './ConditionalMovesEditorState.js';

type ConditionalMovesEditorEvents = {

    /**
     * Player has submitted changes.
     */
    conditionalMovesSubmitted: (conditionalMoves: ConditionalMovesStruct) => void;

    /**
     * Player added a move to selectedLine
     */
    selectedLineMoveAdded: (move: Move, byPlayerIndex: 0 | 1) => void;

    /**
     * Player rewinded to an earlier move in selectedLine.
     */
    selectedLineRewinded: (removedMoves: Move[]) => void;

    /**
     * Player rewinded to an earlier move in selectedLine.
     */
    selectedLineReplaced: (selectedLine: Move[]) => void;
};

/**
 * Starts an conditional moves editor instance.
 * Can edit lines, keep them in a temporary tree, submit or discard.
 *
 * Contains a light state, but no GameView. See facade for integration with GameView.
 */
export default class ConditionalMovesEditor extends TypedEmitter<ConditionalMovesEditorEvents>
{
    constructor(
        private state: ConditionalMovesEditorState,
    ) {
        super();
    }

    /**
     * Either add conditional move, or rewind to current selected line...
     * Should be bound to GameView cell clicked event.
     */
    autoAction(move: Move): void
    {
        const index = this.state.selectedLine.indexOf(move);

        if (index >= 0) {
            const removed = this.state.selectedLine.splice(index + 1);
            this.emit('selectedLineRewinded', removed);
            return;
        }

        this.addMove(move);
    }

    /**
     * Move played for real, update current conditional moves.
     */
    realMovePlayed(move: Move, byPlayerIndex: 0 | 1)
    {
        if (byPlayerIndex !== this.getOpponentIndex()) {
            return;
        }

        conditionalMovesShift(this.state.conditionalMoves, move);

        this.discardSimulationMoves();
    }

    getMyIndex(): 0 | 1
    {
        return this.state.myIndex;
    }

    getOpponentIndex(): 0 | 1
    {
        return 1 - this.state.myIndex as 0 | 1;
    }

    /**
     * Conditional moves, submitted.
     */
    getConditionalMoves(): ConditionalMovesStruct
    {
        return this.state.conditionalMoves;
    }

    /**
     * Current state, not yet submitted.
     */
    getConditionalMovesDirty(): ConditionalMovesStruct
    {
        return this.state.conditionalMovesDirty;
    }

    getHasChanges(): boolean
    {
        return this.state.hasChanges;
    }

    getSelectedLine(): Move[]
    {
        return this.state.selectedLine;
    }

    /**
     * Save current conditional moves.
     *
     * @emits ConditionalMovesStruct Conditional moves struct (tree and unplayed lines), should be persisted.
     */
    submitConditionalMoves(): void
    {
        this.state.conditionalMovesDirty.unplayedLines = clearDuplicatedUnplayedLines(this.state.conditionalMovesDirty.unplayedLines);
        copyConditionalMovesStruct(this.state.conditionalMoves, this.state.conditionalMovesDirty);

        this.startNewLine();
        this.state.hasChanges = false;

        this.emit('conditionalMovesSubmitted', this.state.conditionalMoves);
    }

    /**
     * Reset conditional moves like it was on last submit.
     */
    discardSimulationMoves(): void
    {
        this.setSelectedLine([]);

        copyConditionalMovesStruct(this.state.conditionalMovesDirty, this.state.conditionalMoves);

        this.state.hasChanges = false;
    }

    /**
     * Keep current line and go back to root position.
     */
    startNewLine(): void
    {
        this.setSelectedLine([]);
    }

    addMove(move: Move): void
    {
        const byPlayerIndex = (this.state.selectedLine.length + this.state.myIndex + 1) % 2 as 0 | 1;

        this.state.selectedLine.push(move);
        conditionalMovesMergeMoves(this.state.conditionalMovesDirty.tree, this.state.selectedLine);
        this.state.hasChanges = true;
        this.emit('selectedLineMoveAdded', move, byPlayerIndex);
    }

    /**
     * Keeps previous line, merge new line to tree and make it selected.
     */
    setSelectedLine(line: Move[]): void
    {
        this.state.selectedLine = [...line];

        if (line.length > 0) {
            conditionalMovesMergeMoves(this.state.conditionalMovesDirty.tree, [...this.state.selectedLine]);
            this.state.hasChanges = true;
        }

        this.emit('selectedLineReplaced', line);
    }

    /**
     * Go back one move in selected line. Keep current move.
     */
    back(): void
    {
        this.state.selectedLine.pop();
    }

    /**
     * Delete current move (the last move in selected line), and its children.
     */
    cutMove(): void
    {
        if (this.state.selectedLine.length === 0) {
            return;
        }

        conditionalMovesCut(this.state.conditionalMovesDirty.tree, this.state.selectedLine);
        this.state.hasChanges = true;
        this.state.selectedLine.pop();
    }

    /**
     * Remove all unplayed lines. Do not submit state.
     */
    deleteAllInactives(): void
    {
        this.state.conditionalMovesDirty.unplayedLines = [];
        this.state.hasChanges = true;
    }
}
