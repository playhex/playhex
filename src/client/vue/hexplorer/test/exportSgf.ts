import assert from 'assert';
import { describe, it } from 'mocha';
import { sgfToString, sgfFromString } from '../../../../shared/sgf/index.js';
import { sgfToTreeNodes } from '../../../../shared/app/hexplorerSgf.js';
import { GameTree, ROOT_ID } from '../GameTree.js';
import { gameTreeToSgf } from '../exportSgf.js';

describe('gameTreeToSgf', () => {
    it('writes comments on root, moves and setups', () => {
        const tree = new GameTree();
        const move = tree.addMove(ROOT_ID, 'a1');
        const setup = tree.addSetup(move.id, [{ move: 'a1', color: 0 }, { move: 'b2', color: 1 }], 1);

        tree.getNode(ROOT_ID).comment = 'Root';
        move.comment = 'A] tricky \\ one';
        setup.comment = 'Setup';

        assert.strictEqual(
            sgfToString(gameTreeToSgf(tree, 5)),
            '(;FF[4]AP[PlayHex:1.0.0]GM[11]SZ[5]C[Root];B[a1]C[A\\] tricky \\\\ one];PL[W]C[Setup]AW[b2])',
        );
    });

    it('writes setup as a difference with previous position', () => {
        const tree = new GameTree();
        const first = tree.addSetup(ROOT_ID, [{ move: 'a1', color: 0 }, { move: 'b2', color: 0 }, { move: 'c3', color: 1 }], 0);

        tree.addSetup(first.id, [{ move: 'a1', color: 0 }, { move: 'b2', color: 1 }], 1);

        const { moves } = gameTreeToSgf(tree, 5);

        assert.deepStrictEqual(moves?.[0], { PL: 'B', AB: ['a1', 'b2'], AW: ['c3'] });
        assert.deepStrictEqual(moves?.[1], { PL: 'W', AW: ['b2'], AE: ['c3'] });
    });

    it('can be read back: moves, variations, setups, marks and comments', () => {
        const tree = new GameTree();
        const a1 = tree.addMove(ROOT_ID, 'a1');
        const setup = tree.addSetup(a1.id, [{ move: 'b2', color: 1 }], 1, [
            { move: 'b2', type: 'triangle' },
            { move: 'c3', type: 'label', text: 'A' },
        ]);

        tree.addMove(a1.id, 'd4');
        tree.addMove(setup.id, 'e5');
        tree.addMove(ROOT_ID, 'c3');
        a1.comment = 'Hello';

        const nodes = sgfToTreeNodes(sgfFromString(sgfToString(gameTreeToSgf(tree, 5))), 5);
        const read = new GameTree();

        read.load(nodes);

        const byParent = (id: number) => read.getNode(id).children.map(childId => {
            const { data } = read.getNode(childId);

            return data?.type === 'move' ? data.move : data?.type;
        });

        assert.deepStrictEqual(byParent(ROOT_ID), ['a1', 'c3']);

        const readA1 = read.getNode(read.getNode(ROOT_ID).children[0]);

        assert.strictEqual(readA1.comment, 'Hello');
        assert.deepStrictEqual(byParent(readA1.id), ['setup', 'd4']);

        const readSetup = read.getNode(readA1.children[0]);

        assert.deepStrictEqual(readSetup.data, {
            type: 'setup',
            stones: [{ move: 'b2', color: 1 }],
            marks: [{ move: 'b2', type: 'triangle' }, { move: 'c3', type: 'label', text: 'A' }],
            nextPlayer: 1,
        });
        assert.deepStrictEqual(byParent(readSetup.id), ['e5']);
    });
});
