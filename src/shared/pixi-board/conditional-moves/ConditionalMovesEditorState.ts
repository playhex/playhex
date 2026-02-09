import { Move } from '../../move-notation/move-notation.js';
import { copyConditionalMovesStruct } from './conditionalMovesUtils.js';
import { ConditionalMovesStruct } from './types.js';

/**
 * Contains all properties needed and mutated by ConditionalMovesEditor.
 * Useful to make it reactive, or keep an instance to instanciate a new editor with previous state.
 */
export type ConditionalMovesEditorState = {

    /**
     * Point of view of conditional moves.
     * First conditional move in lines will be of color `1 - myIndex`
     */
    myIndex: 0 | 1;

    /**
     * Conditional moves instance, with currently saved conditional moves.
     */
    conditionalMoves: ConditionalMovesStruct;

    /**
     * Current modified version of conditional moves.
     * Can be submitted or discarded.
     */
    conditionalMovesDirty: ConditionalMovesStruct;

    /**
     * Whether there is current added/edited/removed conditional moves,
     * and could be saved or discarded.
     */
    hasChanges: boolean;

    /**
     * Currently selected line in the tree.
     * Should be highlihted, and actions like cutting will be done on this line, or last move in this line.
     */
    selectedLine: Move[];
};

/**
 * Creates a state that can be passed to editor.
 */
export const createConditionalMovesEditorState = (
    myIndex: 0 | 1,
    conditionalMoves: ConditionalMovesStruct = { tree: [], unplayedLines: [] },
): ConditionalMovesEditorState => {
    const state: ConditionalMovesEditorState = {
        myIndex,
        conditionalMoves,
        conditionalMovesDirty: { tree: [], unplayedLines: [] },
        hasChanges: false,
        selectedLine: [],
    };

    copyConditionalMovesStruct(state.conditionalMovesDirty, state.conditionalMoves);

    return state;
};
