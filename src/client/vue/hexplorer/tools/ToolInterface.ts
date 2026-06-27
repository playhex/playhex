import { Move } from '../../../../shared/move-notation/move-notation.js';
import { UndoableAction } from '../undoredo/undoredo.js';

export interface ToolInterface
{
    createUndoableAction(move: Move): UndoableAction | null;

    /**
     * Returns whether a drag starting on this move adds or removes, or null if this tool
     * does not support drag-painting.
     */
    getDragMode?(move: Move): 'add' | 'remove' | null;

    /**
     * Creates an action that unconditionally applies the given mode (no toggling).
     * Returns null if the cell is already in the desired state and should be skipped.
     */
    createDragAction?(move: Move, mode: 'add' | 'remove'): UndoableAction | null;
}
