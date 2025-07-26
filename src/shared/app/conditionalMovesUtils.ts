import { ConditionalMovesLine, ConditionalMovesTree } from './models/ConditionalMoves.js';

export type ConditionalMovesStruct = {
    tree: ConditionalMovesTree;
    unplayedLines: ConditionalMovesLine[];
};

/**
 * Get answer from conditional moves and move played by opponent.
 * Updates tree to remove played moves (both move and answer).
 * Unplayed lines are moves from tree to unplayedLines.
 * Lines containing a move that can no longer be played are removed.
 *
 * @param conditionalMoves Instance of ConditionalMoves to update. Will update tree, and move other lines to unplayed lines.
 * @param lastMove Last move by opponent, will return an answer to this move. Then, both move and answer will be shifted from tree.
 */
export const conditionalMovesShift = (conditionalMoves: ConditionalMovesStruct, lastMove: string): null | string => {
    const { tree } = conditionalMoves;

    const playedLine = tree.find(line => line[0] === lastMove);

    if (undefined === playedLine) {
        conditionalMoves.unplayedLines.unshift(...tree);
        conditionalMoves.tree = [];

        conditionalMoves.unplayedLines = conditionalMoves.unplayedLines.filter(unplayedLine => !lineContainsMove(unplayedLine, lastMove));
        conditionalMoves.unplayedLines = clearDuplicatedUnplayedLines(conditionalMoves.unplayedLines);

        return null;
    }

    const answer = playedLine[1] ?? null;

    conditionalMoves.unplayedLines.unshift(...tree.filter(line => line[0] !== lastMove));
    conditionalMoves.tree = playedLine[2] ?? [];

    if (answer === null) {
        conditionalMoves.unplayedLines = conditionalMoves.unplayedLines.filter(unplayedLine => !lineContainsMove(unplayedLine, lastMove));
        conditionalMoves.unplayedLines = clearDuplicatedUnplayedLines(conditionalMoves.unplayedLines);

        return null;
    }

    conditionalMoves.unplayedLines = conditionalMoves.unplayedLines.filter(unplayedLine => !lineContainsMove(unplayedLine, lastMove, answer));
    conditionalMoves.unplayedLines = clearDuplicatedUnplayedLines(conditionalMoves.unplayedLines);

    return answer;
};

/**
 * Adds a line to a conditional moves tree.
 * Merge it with an existing line, extend it if new move,
 * replace answer if different answer, or add a new line.
 */
export const conditionalMovesMergeMoves = (tree: ConditionalMovesTree, moves: string[]): void => {
    if (moves.length === 0) {
        return;
    }

    moves = [...moves];

    const mergeRecursive = (subTree: ConditionalMovesTree): void => {
        const matchedLine = subTree.find(line => line[0] === moves[0]);

        // new line, append it
        if (undefined === matchedLine) {
            const conditionalMovesLine = flatMovesToTree(moves);

            if (undefined === conditionalMovesLine) {
                return;
            }

            subTree.push(conditionalMovesLine);
            return;
        }

        moves.shift();
        const answer = moves.shift();

        // no answer, ignore
        if (undefined === answer) {
            return;
        }

        // different answer, replace line
        if (answer !== matchedLine[1]) {
            matchedLine[1] = answer;
            const conditionalMovesLine = flatMovesToTree(moves);

            if (undefined !== conditionalMovesLine) {
                matchedLine[2] = [conditionalMovesLine];
            } else {
                matchedLine.splice(2);
            }

            return;
        }

        // same line but new moves, extend it
        if (undefined === matchedLine[2]) {
            const conditionalMovesLine = flatMovesToTree(moves);

            if (undefined !== conditionalMovesLine) {
                matchedLine[2] = [conditionalMovesLine];
            } else {
                matchedLine.splice(2);
            }

            return;
        }

        mergeRecursive(matchedLine[2]);
    };

    mergeRecursive(tree);
};

/**
 * Removes all exact same lines in unplayed lines to prevent duplicates.
 */
export const clearDuplicatedUnplayedLines = (lines: ConditionalMovesLine[]): ConditionalMovesLine[] => {
    const dedupedLines: ConditionalMovesLine[] = [];

    for (const line of lines) {
        if (dedupedLines.every(dedupedLine => !isSameLines(dedupedLine, line))) {
            dedupedLines.push(line);
        }
    }

    return dedupedLines;
};

/**
 * Whether move appears at least once in whole line and its sublines.
 */
export const lineContainsMove = (line: ConditionalMovesLine, ...moves: string[]): boolean => {
    if (moves.includes(line[0])) {
        return true;
    }

    if (undefined === line[1]) {
        return false;
    }

    if (moves.includes(line[1])) {
        return true;
    }

    if (undefined === line[2]) {
        return false;
    }

    return line[2].some(subLine => lineContainsMove(subLine, ...moves));
};

/**
 * Compare 2 lines. Order of sublines is insensitive.
 */
export const isSameLines = (a: ConditionalMovesLine, b: ConditionalMovesLine): boolean => {
    if (a[0] !== b[0] || a[1] !== b[1]) {
        return false;
    }

    if ((a[2]?.length ?? 0) !== (b[2]?.length ?? 0)) {
        return false;
    }

    if (undefined === a[2]) {
        return true;
    }

    return a[2].every(aLine => {
        if (undefined === b[2]) {
            return false;
        }

        const bLine = b[2].find(bMove => bMove[0] === aLine[0]);

        if (undefined === bLine) {
            return false;
        }

        return isSameLines(aLine, bLine);
    });
};

/**
 * Returns next conditional moves right after a given live, or the answer if line ends on a move.
 * E.g passing [] in moves will return all first-level conditional moves,
 * passing ['a1'] will return answer of a1,
 * passing ['a1', 'a2'] will return all next conditional moves after a2.
 */
export const getNextMovesAfterLine = (tree: ConditionalMovesTree, moves: string[]): string[] => {

    const recursive = (currentTree: ConditionalMovesTree, currentMoves: string[]): string[] => {
        currentMoves = [...currentMoves];
        const move = currentMoves.shift();

        if (undefined === move) {
            return currentTree.map(line => line[0]);
        }

        const currentLine = currentTree.find(line => line[0] === move);

        if (undefined === currentLine) {
            return [];
        }

        const answer = currentMoves.shift();

        if (undefined === answer) {
            return currentLine[1] ? [currentLine[1]] : [];
        }

        if (undefined === currentLine[1]) {
            return [];
        }

        if (answer !== currentLine[1]) {
            return [];
        }

        if (undefined === currentLine[2]) {
            return [];
        }

        return recursive(currentLine[2], currentMoves);
    };

    return recursive(tree, moves);
};

const flatMovesToTree = (moves: string[]): undefined | ConditionalMovesLine => {
    const move = moves.shift();

    if (undefined === move) {
        return undefined;
    }

    const result: ConditionalMovesLine = [move];
    const answer = moves.shift();

    if (undefined !== answer) {
        result.push(answer);

        const next = flatMovesToTree(moves);

        if (undefined !== next) {
            result.push([next]);
        }
    }

    return result;
};

/**
 * Cut a move in the tree, and child moves.
 *
 * Cut all when passing empty moves, i.e cutting the root.
 * Does nothing if line does not exists.
 *
 * @param moves Line to remove: will cut last move from this line, and all children.
 */
export const conditionalMovesCut = (tree: ConditionalMovesTree, moves: string[]): void => {
    if (moves.length === 0) {
        tree.splice(0);
        return;
    }

    const cutRecursive = (currentTree: ConditionalMovesTree, currentMoves: string[]): void => {
        const move = currentMoves.shift();

        if (undefined === move) {
            throw new Error('Unexpected empty moves');
        }

        const currentLineIndex = currentTree.findIndex(line => line[0] === move);
        const currentLine = currentTree[currentLineIndex];

        // line does not exists, do nothing
        if (undefined === currentLine) {
            return;
        }

        const answer = currentMoves.shift();

        // no answer, cut tree at root
        if (undefined === answer) {
            currentTree.splice(currentLineIndex, 1);
            return;
        }

        // line is longer than this tree branch, do nothing
        if (undefined === currentLine[1]) {
            return;
        }

        // line does not match, do nothing
        if (answer !== currentLine[1]) {
            return;
        }

        // line fully matched, cut answer
        if (currentMoves.length === 0) {
            currentLine.splice(1);
            return;
        }

        // line is longer than this tree branch, do nothing
        if (undefined === currentLine[2]) {
            return;
        }

        cutRecursive(currentLine[2], currentMoves);

        // do not keep empty sublines like: [a1, a2, []]
        if (currentLine[2].length === 0) {
            currentLine.splice(2);
        }
    };

    cutRecursive(tree, [...moves]);
};

/**
 * Validate an object against conditional moves line formatting
 */
export const validateLineFormat = (line: unknown): line is ConditionalMovesLine => {
    if (!Array.isArray(line) || line.length === 0 || line.length > 3) {
        return false;
    }

    const move = line[0];

    if (typeof move !== 'string') {
        return false;
    }

    if (line.length > 1) {
        const answer = line[1];

        if (typeof answer !== 'string') {
            return false;
        }

        if (line.length > 2) {
            const sublines = line[2];

            if (!Array.isArray(sublines) || sublines.length === 0) {
                return false;
            }

            if (sublines.some(subline => !validateLineFormat(subline))) {
                return false;
            }
        }
    }

    return true;
};

/**
 * Validate an object against conditional moves tree formatting
 */
export const validateTreeFormat = (tree: unknown): tree is ConditionalMovesTree => {
    if (!Array.isArray(tree)) {
        return false;
    }

    return tree.every(line => validateLineFormat(line));
};
