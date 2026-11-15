import assert from 'assert';
import { describe, it } from 'mocha';
import { GameTree, ROOT_ID } from '../GameTree.js';
import { makeNodeMentionsInteractive, nodeMentionLabel, resolveNodeMention } from '../nodeMention.js';

describe('nodeMention', () => {
    it('labels nodes with move number and move', () => {
        const tree = new GameTree();
        const a = tree.addMove(ROOT_ID, 'a1');
        const b = tree.addMove(a.id, 'swap-pieces');
        const c = tree.addMove(b.id, 'pass');
        const d = tree.addSetup(c.id, [{ move: 'c3', color: 0 }], 1);

        assert.strictEqual(nodeMentionLabel(tree, ROOT_ID), null);
        assert.strictEqual(nodeMentionLabel(tree, a.id), '1.a1');
        assert.strictEqual(nodeMentionLabel(tree, b.id), '2.swap');
        assert.strictEqual(nodeMentionLabel(tree, c.id), '3.pass');
        assert.strictEqual(nodeMentionLabel(tree, d.id), '4.setup');
    });

    it('resolves nodes, preferring current line', () => {
        const tree = new GameTree();
        const a = tree.addMove(ROOT_ID, 'a1');
        const b1 = tree.addMove(a.id, 'b2');
        const c1 = tree.addMove(b1.id, 'c3');
        const b2 = tree.addMove(a.id, 'b3');
        const c2 = tree.addMove(b2.id, 'c3');

        assert.strictEqual(resolveNodeMention(tree, '1.a1', ROOT_ID), a.id);

        // ancestors or first children of current node
        assert.strictEqual(resolveNodeMention(tree, '3.c3', ROOT_ID), c1.id);
        assert.strictEqual(resolveNodeMention(tree, '3.c3', b2.id), c2.id);
        assert.strictEqual(resolveNodeMention(tree, '3.c3', c2.id), c2.id);
        assert.strictEqual(resolveNodeMention(tree, '3.c3', c1.id), c1.id);

        // not on current line
        assert.strictEqual(resolveNodeMention(tree, '2.b3', c1.id), b2.id);

        assert.strictEqual(resolveNodeMention(tree, '2.c3', ROOT_ID), null);
        assert.strictEqual(resolveNodeMention(tree, '4.c3', ROOT_ID), null);
        assert.strictEqual(resolveNodeMention(tree, '0.c3', ROOT_ID), null);
    });

    it('makes mentions interactive, not in links', () => {
        assert.strictEqual(
            makeNodeMentionsInteractive('12.e5 or 3.Swap, not e5 nor 1.2'),
            '<span class="coords" data-node-mention="12.e5">12.e5</span> or <span class="coords" data-node-mention="3.swap">3.Swap</span>, not e5 nor 1.2',
        );

        assert.strictEqual(
            makeNodeMentionsInteractive('see https://example.org/12.e5 and <a href="x">12.e5</a>'),
            'see https://example.org/12.e5 and <a href="x">12.e5</a>',
        );
    });
});
