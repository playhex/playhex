import { Move } from '../../../../shared/move-notation/move-notation';
import { UndoableAction } from '../undoredo/undoredo';

export interface ToolInterface
{
    createUndoableAction(move: Move): UndoableAction;
}
