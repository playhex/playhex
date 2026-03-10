import assert from 'assert';
import { createConditionalMovesEditorState } from '../conditional-moves/ConditionalMovesEditorState.js';
import ConditionalMovesEditor from '../conditional-moves/ConditionalMovesEditor.js';

describe('ConditionalMovesEditor', () => {
    it('can add move, then submit', () => {
        const state = createConditionalMovesEditorState(0);
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

    it('rewinds to earlier move when calling autoAction a move in the line', () => {
        const state = createConditionalMovesEditorState(0);
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
});
