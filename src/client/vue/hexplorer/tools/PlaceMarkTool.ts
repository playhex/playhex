import { Ref, unref } from 'vue';
import { Move } from '../../../../shared/move-notation/move-notation.js';
import { ToolInterface } from './ToolInterface.js';
import { UndoableAction } from '../undoredo/undoredo.js';
import { BoardMarksLayer, MarkType } from '../BoardMarksLayer.js';

/**
 * Toggles a mark on the clicked cell: places it if absent or different,
 * removes it if the same mark (and, for labels, the same text) is already there.
 *
 * `select` (highlight) is independent of the other mark types and toggled
 * separately, so it can be layered on top of any shape/label mark.
 *
 * `text` can be a Ref so e.g a label tool stays bound to a live input
 * value, without needing to recreate the tool each time the text changes.
 */
export class PlaceMarkTool implements ToolInterface
{
    constructor(
        private marksLayer: BoardMarksLayer,
        readonly markType: MarkType,
        private text?: string | Ref<string>,
    ) {}

    createUndoableAction(move: Move): UndoableAction
    {
        const markType = this.markType;

        if (markType === 'select') {
            const previousSelected = this.marksLayer.isSelected(move);
            const newSelected = !previousSelected;

            return {
                do: () => {
                    this.marksLayer.setSelected(move, newSelected);
                },
                undo: () => {
                    this.marksLayer.setSelected(move, previousSelected);
                },
            };
        }

        const text = unref(this.text);
        const previousType = this.marksLayer.getMarkType(move);
        const previousText = this.marksLayer.getMarkText(move);

        const isSame = previousType === markType
            && (markType !== 'label' || previousText === text);

        const newType = isSame ? null : markType;
        const newText = isSame ? undefined : text;

        return {
            do: () => {
                this.marksLayer.setMark(move, newType, newText);
            },
            undo: () => {
                this.marksLayer.setMark(move, previousType, previousText);
            },
        };
    }
}
