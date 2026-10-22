import assert from 'assert';
import { describe, it } from 'mocha';
import type { Move } from '@playhex/move-notation';
import { declareParallelSequences, NodeBudget, type BridgeIntrusions, type ParallelCandidates, type ParallelsContext } from '../../puzzles/PuzzleTreeParallels.js';
import type { PuzzleNode } from '../../../shared/app/puzzles/puzzleTree.js';
import type { PuzzleGenerateWarningCode } from '../../../shared/app/puzzles/puzzleGenerate.js';

const createBridge = (intrusion: Move, answer: Move): BridgeIntrusions => ({
    key: [intrusion, answer].sort().join(','),
    sequences: [[intrusion, answer]],
});

/**
 * Start node with main move c3, and bridges intrusions found on it.
 */
const createContext = (bridges: BridgeIntrusions[], budget = 100) => {
    const start: PuzzleNode = { children: [{ move: 'c3' }] };
    const candidates: ParallelCandidates = {
        position: { red: [], blue: [], toMove: 0 },
        winning: new Map(),
        avoid: new Set(),
        blocked: new Set(),
        bridges,
    };
    const warnings: { code: PuzzleGenerateWarningCode, path: Move[] }[] = [];
    const context: ParallelsContext = {
        tree: start,
        start,
        inheritedCells: new Set(),
        candidates: new Map([[start, candidates]]),
        paths: new Map([[start, []]]),
        budget: new NodeBudget(budget),
        warn: (code, path) => warnings.push({ code, path }),
    };

    /**
     * Bridges played as main moves, as PuzzleTreeGenerator does: removed from candidates.
     */
    const played: BridgeIntrusions[][] = [];
    const playIntrusions = (node: PuzzleNode, dropped: BridgeIntrusions[]): Promise<void> => {
        played.push(dropped);
        candidates.bridges = candidates.bridges.filter(bridge => !dropped.includes(bridge));

        return Promise.resolve();
    };

    return { start, context, warnings, played, playIntrusions };
};

describe('PuzzleTreeParallels', () => {
    it('declares bridges intrusions as parallel sequences', async () => {
        const { start, context, played, playIntrusions } = createContext([createBridge('a1', 'a2')]);

        await declareParallelSequences(context, playIntrusions);

        assert.deepStrictEqual(start.parallel, [{ children: [{ move: 'a1', children: [{ move: 'a2' }] }] }]);
        assert.deepStrictEqual(played, []);
    });

    it('plays as main moves bridges whose cells are used by main sequence', async () => {
        const overlapping = createBridge('c3', 'c4');
        const { start, context, played, playIntrusions } = createContext([createBridge('a1', 'a2'), overlapping]);

        await declareParallelSequences(context, playIntrusions);

        assert.deepStrictEqual(played, [[overlapping]]);
        assert.deepStrictEqual(start.parallel, [{ children: [{ move: 'a1', children: [{ move: 'a2' }] }] }]);
    });

    it('warns when nodes budget is exceeded', async () => {
        const { start, context, warnings, played, playIntrusions } = createContext([createBridge('a1', 'a2')], 2);

        await declareParallelSequences(context, playIntrusions);

        assert.strictEqual(start.parallel, undefined);
        assert.deepStrictEqual(played, []);
        assert.deepStrictEqual(warnings, [{ code: 'generator_parallel_dropped', path: [] }]);
    });

    it('keeps existing parallel sequences, and does not overlap them', async () => {
        const existing: PuzzleNode = { children: [{ move: 'b1', children: [{ move: 'b2' }] }] };
        const overlapping = createBridge('b1', 'd1');
        const { start, context, played, playIntrusions } = createContext([overlapping]);

        start.parallel = [existing];

        await declareParallelSequences(context, playIntrusions);

        assert.deepStrictEqual(start.parallel, [existing]);
        assert.deepStrictEqual(played, [[overlapping]]);
    });
});
