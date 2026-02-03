import { Move } from '../../move-notation/move-notation.js';

export type ConditionalMovesLine = [
    // move
    Move,

    // answer
    Move?,

    // next conditional moves
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [Move, Move?, [Move, Move?, any[]?][]?][]?, // ConditionalMovesTree?, // Not using recursive type because makes IDE constantly uses 100% cpu.
];

/**
 * A full tree of conditional move.
 * Should not contain multiple answers to same move.
 */
export type ConditionalMovesTree = ConditionalMovesLine[];

export type ConditionalMovesStruct = {
    tree: ConditionalMovesTree;
    unplayedLines: ConditionalMovesLine[];
};
