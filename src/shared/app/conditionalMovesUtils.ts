import { Move } from '../game-engine';
import { ConditionalMoves } from './models';
import { ConditionalMovesLine, ConditionalMovesTree } from './models/ConditionalMoves';

/**
 * Get answer from conditional moves and move played by opponent.
 * Updates tree to remove played moves (both move and answer).
 * Unplayed lines are moves from tree to unplayedLines.
 * Lines containing a move that can no longer be played are removed.
 *
 * @param conditionalMoves Instance of ConditionalMoves to update. Will update tree, and move other lines to unplayed lines.
 * @param lastMove Last move by opponent, will return an answer to this move. Then, both move and answer will be shifted from tree.
 */
export const conditionalMovesShift = (conditionalMoves: ConditionalMoves, lastMove: Move): null | Move => {
    const { tree } = conditionalMoves;
    const lastMoveStr = lastMove.toString();

    const playedLine = tree.find(line => line[0] === lastMoveStr);

    if (undefined === playedLine) {
        conditionalMoves.unplayedLines.push(...tree);
        conditionalMoves.tree = [];

        return null;
    }

    const answer = playedLine[1] ?? null;

    conditionalMoves.unplayedLines.push(...tree.filter(line => line[0] !== lastMoveStr));
    conditionalMoves.tree = playedLine[2] ?? [];

    if (null === answer) {
        return null;
    }

    return Move.fromString(answer);
};

/**
 * Adds a line to a conditional moves tree.
 * Merge it with an existing line, extend it if new move,
 * replace answer if different answer, or add a new line.
 */
export const conditionalMovesMergeMoves = (tree: ConditionalMovesTree, moves: string[]): void => {
    if (0 === moves.length) {
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
 * Clean unplayed lines if it is already present, or included in tree.
 */
export const cleanRedundantUnplayedLines = (conditionalMoves: ConditionalMoves): void => {
    const cleanedUnplayedLines: ConditionalMovesLine[] = [];

    for (const unplayedLine of conditionalMoves.unplayedLines) {
        cleanedUnplayedLines.push(unplayedLine);
    }

    conditionalMoves.unplayedLines = cleanedUnplayedLines;
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
