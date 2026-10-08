import type { PuzzleDefinition } from '../puzzles/puzzleTree.js';

/**
 * Puzzles of tutorial template steps.
 * Messages are i18n keys, translated when displayed.
 *
 * Red connects top and bottom, blue connects left and right.
 * Red plays, computer (blue) answers.
 */
export type TutorialPuzzle = PuzzleDefinition & {
    /**
     * i18n key of the puzzle instruction.
     */
    instructionKey: string;
};

/**
 * Bridge: two stones with two common empty neighbours.
 */
export const bridgePuzzles: TutorialPuzzle[] = [
    {
        // Blue intrudes a bridge: red must play the other common cell
        instructionKey: 'tutorial.puzzles.bridge_1.instruction',
        boardsize: 5,
        redStones: ['c2', 'b4'],
        blueStones: ['b2', 'c3', 'd3'],
        lastMove: 'c3',
        playerColor: 0,
        tree: {
            children: [
                { move: 'b3', result: 'solved', message: 'tutorial.puzzles.bridge_1.solved' },
                { else: 'b3', message: 'tutorial.puzzles.bridge_1.failed' },
            ],
        },
    },
    {
        // Reach the edge: bridge to the edge
        instructionKey: 'tutorial.puzzles.bridge_2.instruction',
        boardsize: 5,
        redStones: ['c1', 'c2', 'c3'],
        blueStones: ['c4', 'd4', 'e4'],
        lastMove: 'c4',
        playerColor: 0,
        tree: {
            children: [
                {
                    move: 'b4',
                    children: [
                        {
                            move: 'b5',
                            message: 'tutorial.puzzles.bridge_2.blue_intrudes',
                            children: [
                                { move: 'a5', result: 'solved', message: 'tutorial.puzzles.bridge_2.solved' },
                                { else: 'a5', message: 'tutorial.puzzles.bridge_2.failed_after_intrusion' },
                            ],
                        },
                    ],
                },
                { else: 'b4', message: 'tutorial.puzzles.bridge_2.failed' },
            ],
        },
    },
    {
        // One move makes two bridges at once
        instructionKey: 'tutorial.puzzles.bridge_3.instruction',
        boardsize: 7,
        redStones: ['e2', 'c6'],
        blueStones: ['b4', 'c4', 'e4', 'f4'],
        lastMove: 'e4',
        playerColor: 0,
        tree: {
            children: [
                {
                    move: 'd4',
                    children: [
                        {
                            move: 'd3',
                            message: 'tutorial.puzzles.bridge_3.blue_intrudes',
                            children: [
                                { move: 'e3', result: 'solved', message: 'tutorial.puzzles.bridge_3.solved' },
                                { else: 'e3', message: 'tutorial.puzzles.bridge_3.failed_after_intrusion' },
                            ],
                        },
                    ],
                },
                { else: 'd4', message: 'tutorial.puzzles.bridge_3.failed' },
            ],
        },
    },
];

/**
 * Ziggurat (template IIIa): a third row stone connected to the edge.
 * Stone c3 on 5x5, red to bottom: d3, b4 c4 d4, a5 b5 c5 d5.
 */
export const zigguratPuzzles: TutorialPuzzle[] = [
    {
        // Intrusion on first row: the only answer is a bridge to the other side
        instructionKey: 'tutorial.puzzles.ziggurat_1.instruction',
        boardsize: 5,
        redStones: ['c1', 'c2', 'c3'],
        blueStones: ['b3', 'e4', 'b5'],
        lastMove: 'b5',
        playerColor: 0,
        tree: {
            children: [
                {
                    move: 'd4',
                    children: [
                        {
                            move: 'c4',
                            message: 'tutorial.puzzles.ziggurat_1.blue_intrudes',
                            children: [
                                { move: 'd3', result: 'solved', message: 'tutorial.puzzles.ziggurat_1.solved' },
                                { else: 'd3', message: 'tutorial.puzzles.ziggurat_1.failed_after_intrusion' },
                            ],
                        },
                    ],
                },
                {
                    move: 'c4',
                    result: 'failed',
                    message: 'tutorial.puzzles.ziggurat_1.failed_c4',
                    children: [{ move: 'c5' }],
                },
                { else: 'd4', message: 'tutorial.puzzles.ziggurat_1.failed' },
            ],
        },
    },
    {
        // Intrusion in the middle of second row
        instructionKey: 'tutorial.puzzles.ziggurat_2.instruction',
        boardsize: 5,
        redStones: ['c1', 'c2', 'c3'],
        blueStones: ['b3', 'e4', 'c4'],
        lastMove: 'c4',
        playerColor: 0,
        tree: {
            children: [
                {
                    move: 'b4',
                    children: [
                        {
                            move: 'a5',
                            message: 'tutorial.puzzles.ziggurat_2.blue_intrudes',
                            children: [
                                { move: 'b5', result: 'solved', message: 'tutorial.puzzles.ziggurat_2.solved' },
                                { else: 'b5', message: 'tutorial.puzzles.ziggurat_2.failed_after_intrusion' },
                            ],
                        },
                    ],
                },
                { else: 'b4', message: 'tutorial.puzzles.ziggurat_2.failed' },
            ],
        },
    },
    {
        // Bridge and ziggurat together: defend both
        instructionKey: 'tutorial.puzzles.ziggurat_3.instruction',
        boardsize: 6,
        redStones: ['d2', 'c4'],
        blueStones: ['b3', 'e3', 'a5', 'e5', 'c5'],
        lastMove: 'c5',
        playerColor: 0,
        tree: {
            children: [
                {
                    move: 'b5',
                    children: [
                        {
                            move: 'd3',
                            message: 'tutorial.puzzles.ziggurat_3.blue_intrudes',
                            children: [
                                { move: 'c3', result: 'solved', message: 'tutorial.puzzles.ziggurat_3.solved' },
                                { else: 'c3', message: 'tutorial.puzzles.ziggurat_3.failed_after_intrusion' },
                            ],
                        },
                    ],
                },
                { else: 'b5', message: 'tutorial.puzzles.ziggurat_3.failed' },
            ],
        },
    },
];
