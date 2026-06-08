import { Move } from '../../../../shared/move-notation/move-notation';
import { UndoableAction } from '../undoredo/undoredo';
import { ToolInterface } from './ToolInterface';

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
