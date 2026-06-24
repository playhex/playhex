import { Move } from '../../../../shared/move-notation/move-notation.js';
import { UndoableAction } from '../undoredo/undoredo.js';
import { ToolInterface } from './ToolInterface.js';

export class NoopTool implements ToolInterface
{
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createUndoableAction(move: Move): UndoableAction
    {
        return {
            do: () => {
                // noop
            },
            undo: () => {
                // noop
            },
        };
    }
}
