import { Move } from '../../../../shared/move-notation/move-notation.js';
import { UndoableAction } from '../undoredo/undoredo.js';

export interface ToolInterface
{
    createUndoableAction(move: Move): UndoableAction;
}
