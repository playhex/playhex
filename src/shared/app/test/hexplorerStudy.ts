import assert from 'assert';
import { describe, it } from 'mocha';
import { createHexplorerState, getHexplorerPositionAt, HEXPLORER_COMMENT_MAX_LENGTH, HEXPLORER_PLAYER_NAME_MAX_LENGTH, HEXPLORER_STUDY_MAX_NODES, InvalidHexplorerStateError, movesToTreeNodes, parseHexplorerState, type HexplorerState, type TreeNode } from '../hexplorerStudy.js';

const stateWith = (nodes: unknown[], others: object = {}) => ({ ...createHexplorerState(5), nodes, ...others });

const root = (children: number[] = []): TreeNode => ({ id: 0, parentId: null, children, data: null });
const move = (id: number, parentId: number, cell: string, children: number[] = []): TreeNode => ({
    id,
    parentId,
    children,
    data: { type: 'move', move: cell as 'a1' },
});

const assertInvalid = (data: unknown): void => {
    assert.throws(() => parseHexplorerState(data), InvalidHexplorerStateError);
};

describe('parseHexplorerState', () => {
    it('keeps a valid state with branches, setup, marks and comments', () => {
        const state: HexplorerState = stateWith([
            { ...root([1, 2]), comment: 'Start' },
            move(1, 0, 'a1'),
            {
                id: 2,
                parentId: 0,
                children: [],
                data: {
                    type: 'setup',
                    stones: [{ move: 'b2', color: 1 }],
                    marks: [{ move: 'c3', type: 'label', text: 'A' }, { move: 'd4', type: 'select' }],
                    nextPlayer: 1,
                },
                comment: 'Interesting',
            },
        ], { playerBlackName: 'Alice', analyzerName: 'KataHex', currentNodeId: 2 }) as HexplorerState;

        assert.deepStrictEqual(parseHexplorerState(JSON.parse(JSON.stringify(state))), state);
    });

    it('fills settings missing from an analysis saved by a previous version', () => {
        const state = parseHexplorerState({ boardsize: 5, currentNodeId: 0, nodes: [root()] });

        assert.deepStrictEqual(state, createHexplorerState(5));
    });

    it('drops unknown fields', () => {
        const state = parseHexplorerState({ ...stateWith([{ ...root(), unknown: 1 }]), unknown: 1 });

        assert.deepStrictEqual(state, createHexplorerState(5));
    });

    it('goes back to root when current node does not exist', () => {
        assert.strictEqual(parseHexplorerState(stateWith([root()], { currentNodeId: 8 })).currentNodeId, 0);
    });

    it('always leaves setup mode', () => {
        assert.strictEqual(parseHexplorerState(stateWith([root()], { setupMode: true })).setupMode, false);
    });

    it('refuses malformed data', () => {
        assertInvalid(null);
        assertInvalid('text');
        assertInvalid({ boardsize: 5 });
        assertInvalid(stateWith([root()], { boardsize: 0 }));
        assertInvalid(stateWith([root()], { boardsize: 54 }));
        assertInvalid(stateWith([root()], { autoPlay: [true] }));
        assertInvalid(stateWith([root()], { playerBlackName: 12 }));
    });

    it('truncates too long names, which may come from an imported game', () => {
        const state = parseHexplorerState(stateWith([root()], { playerBlackName: 'x'.repeat(100) }));

        assert.strictEqual(state.playerBlackName?.length, HEXPLORER_PLAYER_NAME_MAX_LENGTH);
    });

    it('refuses a broken tree', () => {
        assertInvalid(stateWith([]));
        assertInvalid(stateWith([move(1, 0, 'a1')]));
        assertInvalid(stateWith([root([1]), { ...move(1, 0, 'a1'), data: null }]));
        assertInvalid(stateWith([root([1]), move(1, 0, 'a1'), move(1, 0, 'a2')]));
        assertInvalid(stateWith([root([1])]));
        assertInvalid(stateWith([root([1]), move(1, 2, 'a1')]));
        assertInvalid(stateWith([root(), move(1, 0, 'a1')]));
        assertInvalid(stateWith([root([1, 1]), move(1, 0, 'a1')]));
    });

    it('refuses a cycle', () => {
        assertInvalid(stateWith([root([1]), move(1, 0, 'a1', [2]), move(2, 1, 'a2', [1])]));
        assertInvalid(stateWith([root(), move(1, 2, 'a1', [2]), move(2, 1, 'a2', [1])]));
    });

    it('refuses invalid cells', () => {
        assertInvalid(stateWith([root([1]), move(1, 0, 'nope')]));
        assertInvalid(stateWith([root([1]), move(1, 0, 'f1')]));
        assertInvalid(stateWith([root([1]), move(1, 0, 'a6')]));
        assertInvalid(stateWith([root([1]), move(1, 0, 'a0')]));
    });

    it('accepts special moves', () => {
        const nodes = [root([1]), move(1, 0, 'a1', [2]), move(2, 1, 'swap-pieces', [3]), move(3, 2, 'pass')];

        assert.strictEqual(parseHexplorerState(stateWith(nodes)).nodes.length, 4);
    });

    it('accepts a swap of first stone after a setup', () => {
        const nodes: TreeNode[] = [
            root([1]),
            { id: 1, parentId: 0, children: [2], data: { type: 'setup', stones: [], marks: [], nextPlayer: 0 } },
            move(2, 1, 'a1', [3]),
            move(3, 2, 'swap-pieces'),
        ];

        assert.strictEqual(parseHexplorerState(stateWith(nodes)).nodes.length, 4);
    });

    it('refuses a swap that cannot be replayed', () => {
        assertInvalid(stateWith([root([1]), move(1, 0, 'swap-pieces')]));
        assertInvalid(stateWith([root([1]), move(1, 0, 'pass', [2]), move(2, 1, 'swap-pieces')]));
        assertInvalid(stateWith([root([1]), move(1, 0, 'a1', [2]), move(2, 1, 'b2', [3]), move(3, 2, 'swap-pieces')]));
        assertInvalid(stateWith([
            root([1]),
            move(1, 0, 'a1', [2]),
            { id: 2, parentId: 1, children: [3], data: { type: 'setup', stones: [], marks: [], nextPlayer: 1 } },
            move(3, 2, 'swap-pieces'),
        ]));
    });

    it('limits comments', () => {
        assertInvalid(stateWith([{ ...root(), comment: 'x'.repeat(HEXPLORER_COMMENT_MAX_LENGTH + 1) }]));
    });

    it('limits nodes only when asked, a big analysis can still be opened from a file', () => {
        const nodes = [
            root(Array.from({ length: HEXPLORER_STUDY_MAX_NODES }, (_, i) => i + 1)),
            ...Array.from({ length: HEXPLORER_STUDY_MAX_NODES }, (_, i) => move(i + 1, 0, 'a1')),
        ];

        assert.strictEqual(parseHexplorerState(stateWith(nodes)).nodes.length, HEXPLORER_STUDY_MAX_NODES + 1);
        assert.throws(() => parseHexplorerState(stateWith(nodes), HEXPLORER_STUDY_MAX_NODES), InvalidHexplorerStateError);
    });
});

describe('movesToTreeNodes', () => {
    it('gives a valid single line', () => {
        const nodes = movesToTreeNodes(['a1', 'swap-pieces', 'b2']);

        assert.deepStrictEqual(nodes.map(node => node.children), [[1], [2], [3], []]);
        assert.strictEqual(parseHexplorerState(stateWith(nodes)).nodes.length, 4);
    });
});

describe('getHexplorerPositionAt', () => {
    it('replays moves of a branch only', () => {
        const nodes = [root([1, 2]), move(1, 0, 'a1'), move(2, 0, 'b2', [3]), move(3, 2, 'c3')];
        const { stones, nextPlayer, lastMove } = getHexplorerPositionAt(nodes, 3);

        assert.deepStrictEqual([...stones], [['b2', 0], ['c3', 1]]);
        assert.strictEqual(nextPlayer, 0);
        assert.strictEqual(lastMove, 'c3');
    });

    it('replaces stones on setup nodes', () => {
        const nodes: TreeNode[] = [
            root([1]),
            move(1, 0, 'a1', [2]),
            { id: 2, parentId: 1, children: [3], data: { type: 'setup', stones: [{ move: 'b2', color: 1 }], marks: [], nextPlayer: 1 } },
            move(3, 2, 'c3'),
        ];
        const { stones, nextPlayer } = getHexplorerPositionAt(nodes, 3);

        assert.deepStrictEqual([...stones], [['b2', 1], ['c3', 1]]);
        assert.strictEqual(nextPlayer, 0);
    });

    it('swaps pieces and passes', () => {
        const nodes = [root([1]), move(1, 0, 'a3', [2]), move(2, 1, 'swap-pieces', [3]), move(3, 2, 'pass')];
        const { stones, nextPlayer, lastMove } = getHexplorerPositionAt(nodes, 3);

        assert.deepStrictEqual([...stones], [['c1', 1]]);
        assert.strictEqual(nextPlayer, 1);
        assert.strictEqual(lastMove, 'c1');
    });
});
