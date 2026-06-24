export type UndoableAction = {
    do: () => void | Promise<void>;
    undo: () => void | Promise<void>;
};

export class UndoableActionsStack
{
    private stack: UndoableAction[] = [];
    private cursor = -1;

    /**
     * do/undo can be async (e.g loading a whole new game on import).
     * Must be awaited so callers can rely on the action being fully applied
     * before reading game state again (e.g calling updateAnalysis()).
     */
    async pushAndDo(undoableAction: UndoableAction): Promise<void>
    {
        // clear previous redo line if any
        if (this.cursor + 1 < this.stack.length) {
            this.stack.splice(this.cursor + 1);
        }

        await undoableAction.do();

        this.stack.push(undoableAction);
        ++this.cursor;
    }

    async undo(): Promise<void>
    {
        if (!this.canUndo()) {
            return;
        }

        await this.stack[this.cursor].undo();
        --this.cursor;
    }

    async redo(): Promise<void>
    {
        if (!this.canRedo()) {
            return;
        }

        ++this.cursor;
        await this.stack[this.cursor].do();
    }

    /**
     * Discards the redo-able actions ahead of the cursor, without undoing anything.
     * Used when the board changed by some other mean (e.g navigating the game),
     * making the pending redo actions stale (they were recorded against a different board position).
     */
    clearRedo(): void
    {
        this.stack.splice(this.cursor + 1);
    }

    canUndo(): boolean
    {
        return this.cursor >= 0;
    }

    canRedo(): boolean
    {
        return this.stack.length > this.cursor + 1;
    }

    getCursorAndLength(): [number, number]
    {
        return [this.cursor, this.stack.length];
    }
}
