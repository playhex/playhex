import assert from 'assert';
import { createConditionalMovesState } from '../../conditional-moves/ConditionalMovesState.js';
import ConditionalMovesEditor from '../../conditional-moves/ConditionalMovesEditor.js';

describe('ConditionalMovesEditor', () => {
    it('can add move, then submit', () => {
        const state = createConditionalMovesState(0);
        const editor = new ConditionalMovesEditor(state);
        let submittedEventEmitted = false;

        editor.on('conditionalMovesSubmitted', () => submittedEventEmitted = true);

        assert.strictEqual(state.hasChanges, false, 'no changes yet');
        assert.deepStrictEqual(state.conditionalMovesDirty.tree, [], 'dirty tree is empty');
        assert.deepStrictEqual(state.conditionalMoves.tree, [], 'tree is empty');
        assert.deepStrictEqual(state.selectedLine, [], 'selectedLine is empty');

        editor.autoAction('a1');

        assert.deepStrictEqual(state.conditionalMovesDirty.tree, [['a1']], 'dirty tree has moves after submit');
        assert.deepStrictEqual(state.conditionalMoves.tree, [], 'tree has no moves until submitted');
        assert.strictEqual(state.hasChanges, true, 'has changes now');
        assert.deepStrictEqual(state.selectedLine, ['a1'], 'a1 line is now selected');
        assert.strictEqual(submittedEventEmitted, false, 'submit event not emitted yet');

        editor.submitConditionalMoves();

        assert.strictEqual(submittedEventEmitted, true, 'submit event emitted');
        assert.deepStrictEqual(state.conditionalMovesDirty.tree, [['a1']], 'dirty tree still has moves after submitted');
        assert.deepStrictEqual(state.conditionalMoves.tree, [['a1']], 'once submitted, tree has moves');
        assert.strictEqual(state.hasChanges, false, 'once submitted, hasChanges has been reset');
    });

    it('rewinds to earlier move when calling autoAction on a move in the line', () => {
        const state = createConditionalMovesState(0);
        const editor = new ConditionalMovesEditor(state);

        // make a line
        editor.autoAction('a1');
        editor.autoAction('a2');
        editor.autoAction('a3');
        editor.autoAction('a4');
        editor.autoAction('a5');

        assert.deepStrictEqual(state.conditionalMovesDirty.tree, [['a1', 'a2', [['a3', 'a4', [['a5']]]]]], 'line created');
        assert.deepStrictEqual(state.selectedLine, ['a1', 'a2', 'a3', 'a4', 'a5']);

        // auto action (clicking) on a3 should rewind to thi position
        editor.autoAction('a3');

        assert.deepStrictEqual(state.conditionalMovesDirty.tree, [['a1', 'a2', [['a3', 'a4', [['a5']]]]]], 'line is still stored in memory');
        assert.deepStrictEqual(state.selectedLine, ['a1', 'a2', 'a3'], 'we are viewing an earlier position');
    });
});
