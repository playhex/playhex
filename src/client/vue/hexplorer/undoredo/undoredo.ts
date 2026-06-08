export type UndoableAction = {
    do: () => void;
    undo: () => void;
};

export class UndoableActionsStack
{
    private stack: UndoableAction[] = [];
    private cursor = -1;

    pushAndDo(undoableAction: UndoableAction): void
    {
        // clear previous redo line if any
        if (this.cursor + 1 < this.stack.length) {
            this.stack.splice(this.cursor + 1);
        }

        undoableAction.do();

        this.stack.push(undoableAction);
        ++this.cursor;
    }

    undo(): void
    {
        if (!this.canUndo()) {
            return;
        }

        this.stack[this.cursor].undo();
        --this.cursor;
    }

    redo(): void
    {
        if (!this.canRedo()) {
            return;
        }

        ++this.cursor;
        this.stack[this.cursor].do();
    }

    canUndo(): boolean
    {
        return this.cursor >= 0;
    }

    canRedo(): boolean
    {
        return this.stack.length > this.cursor + 1;
    }
}
