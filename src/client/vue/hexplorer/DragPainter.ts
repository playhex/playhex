import { Move } from '../../../shared/move-notation/move-notation.js';
import { ToolInterface } from './tools/ToolInterface.js';
import { UndoableAction } from './undoredo/undoredo.js';

/**
 * Just what the painter needs from an UndoableActionsStack,
 * so a Vue-unwrapped ref of one is accepted too.
 */
type ActionsSink = {
    pushAndDo: (undoableAction: UndoableAction) => Promise<void>;
};

/**
 * Paints cells while the pointer is held down: every cell visited during the drag gets
 * its tool action applied live, and the whole drag is registered as a single undo/redo
 * entry when the pointer is released.
 *
 * The drag mode ('add' or 'remove') is decided by the cell the drag started on, so e.g
 * starting on a stone of the tool color removes stones all along the way instead of
 * toggling each cell independently.
 *
 * Tools that do not support dragging (no getDragMode) simply never start a drag:
 * their clicks are handled by the caller through createUndoableAction() instead.
 */
export class DragPainter
{
    private mode: null | 'add' | 'remove' = null;

    private cellActions = new Map<Move, UndoableAction>();

    /**
     * Starts a drag on the pressed cell, if the tool supports it.
     */
    async pointerDown(tool: ToolInterface, move: Move): Promise<void>
    {
        this.reset();

        if (!tool.getDragMode || !tool.createDragAction) {
            return;
        }

        const mode = tool.getDragMode(move);

        if (mode === null) {
            return;
        }

        this.mode = mode;

        await this.applyOn(tool, move);
    }

    /**
     * Extends the current drag to a newly hovered cell.
     */
    async pointerHover(tool: ToolInterface, move: Move): Promise<void>
    {
        if (this.mode === null || this.cellActions.has(move)) {
            return;
        }

        await this.applyOn(tool, move);
    }

    /**
     * Ends the drag and commits every painted cell as a single undoable action.
     * Returns whether something was actually committed, i.e whether the board changed.
     */
    async pointerUp(actionsStack: ActionsSink): Promise<boolean>
    {
        if (this.mode === null) {
            return false;
        }

        const actions = [...this.cellActions.values()];

        this.reset();

        if (actions.length === 0) {
            return false;
        }

        const undoAll = () => {
            for (const action of [...actions].reverse()) {
                void action.undo();
            }
        };

        // Revert live changes so pushAndDo can re-apply them all through do().
        undoAll();

        await actionsStack.pushAndDo({
            do: () => {
                for (const action of actions) {
                    void action.do();
                }
            },
            undo: undoAll,
        });

        return true;
    }

    /**
     * Drops any in-progress drag, without committing it (e.g the board has been rebuilt).
     */
    reset(): void
    {
        this.mode = null;
        this.cellActions.clear();
    }

    private async applyOn(tool: ToolInterface, move: Move): Promise<void>
    {
        const action = tool.createDragAction!(move, this.mode!);

        if (action === null) {
            return;
        }

        await action.do();
        this.cellActions.set(move, action);
    }
}
