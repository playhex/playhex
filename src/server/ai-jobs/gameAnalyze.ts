import { isSpecialHexMove, mirrorMove, type Move } from '@playhex/move-notation';
import type { GameAnalyzeData } from '../../shared/app/models/GameAnalyze.js';
import type { AnalyzeMoveInput, AnalyzeMoveOutput, MoveAndValue } from './protocol.js';

export type AnalyzeGameRequest = {
    size: number;

    /**
     * Like "f6 g7 d4", or "g5 swap-pieces g4 pass".
     */
    movesHistory: string;
};

export const hasSwapMove = ({ movesHistory }: AnalyzeGameRequest): boolean =>
    movesHistory.split(' ')[1] === 'swap-pieces'
;

const parseMoves = (movesHistory: string): string[] =>
    movesHistory.split(' ').filter(move => move !== '')
;

const toAnalyzeMoveInput = (size: number, moves: string[], moveIndex: number): AnalyzeMoveInput => ({
    color: moveIndex % 2 === 0 ? 'black' : 'white',
    move: moves[moveIndex],
    moveIndex,
    movesHistory: moves.slice(0, moveIndex).join(' '),
    size,
    isLastMoveOfGame: moveIndex === moves.length - 1,
});

/**
 * Split a game to analyze in one task per move, to parallelize them.
 * Swap move is not analyzed, it is deduced from third move analyze, see addSwapMoveAnalyze().
 */
export const splitToAnalyzeMoveInputs = ({ size, movesHistory }: AnalyzeGameRequest): AnalyzeMoveInput[] => {
    const moves = parseMoves(movesHistory);

    return moves
        .map((_, moveIndex) => toAnalyzeMoveInput(size, moves, moveIndex))
        .filter(input => !(input.moveIndex === 1 && input.move === 'swap-pieces'))
    ;
};

/**
 * Input to analyze a single move of a game, or null if there is no move at this index.
 */
export const getAnalyzeMoveInput = ({ size, movesHistory }: AnalyzeGameRequest, moveIndex: number): null | AnalyzeMoveInput => {
    const moves = parseMoves(movesHistory);

    if (moveIndex < 0 || moveIndex >= moves.length) {
        return null;
    }

    return toAnalyzeMoveInput(size, moves, moveIndex);
};

const mirrorMoveAndValue = (moveAndValue: MoveAndValue): MoveAndValue => ({
    move: isSpecialHexMove(moveAndValue.move)
        ? moveAndValue.move
        : mirrorMove(moveAndValue.move as Move),
    value: moveAndValue.value, // not mirrored because move value stays same
    whiteWin: moveAndValue.whiteWin === undefined ? undefined : 1 - moveAndValue.whiteWin,
});

/**
 * In case of a swap move, second move is not analyzed.
 * Fill it with analyze from third move, mirrored.
 */
const addSwapMoveAnalyze = (data: (null | AnalyzeMoveOutput)[]): void => {
    const thirdMove = data[2];

    if (data[1] !== null || !thirdMove) {
        return;
    }

    const swapMove: MoveAndValue = {
        move: 'swap-pieces',
        whiteWin: thirdMove.whiteWin,
        value: 0,
    };

    data[1] = {
        moveIndex: 1,
        color: 'white',
        whiteWin: 1 - thirdMove.whiteWin,
        move: swapMove,
        bestMoves: [
            swapMove,
            ...thirdMove.bestMoves.map(mirrorMoveAndValue).filter(m => m.whiteWin !== undefined),
        ].sort((a, b) => (b.whiteWin as number) - (a.whiteWin as number)),
    };
};

/**
 * Merge moves analyzes to a single game analyze.
 * Some moves can be missing (not yet analyzed, or failed), they stay null.
 *
 * @param results Move analyzes, indexed by moveIndex. Not mutated.
 * @param swapped Whether second move is swap-pieces, see hasSwapMove(). Its analyze is then deduced from third move.
 */
export const consolidateGameAnalyze = (results: (null | AnalyzeMoveOutput)[], swapped: boolean): GameAnalyzeData => {
    const data: (null | AnalyzeMoveOutput)[] = results.map(result => result === null ? null : structuredClone(result));

    if (swapped) {
        addSwapMoveAnalyze(data);
    }

    // Win rate after a move is the win rate before next move
    for (let i = 0; i < data.length - 1; ++i) {
        const position = data[i];
        const nextPosition = data[i + 1];

        if (!position || !nextPosition) {
            continue;
        }

        position.move.whiteWin = nextPosition.whiteWin;

        // If move is in best moves list, also set whiteWin here
        const bestMove = position.bestMoves.find(bestMove => bestMove.move === position.move.move);

        if (bestMove) {
            bestMove.whiteWin = nextPosition.whiteWin;
        }
    }

    return data as GameAnalyzeData;
};
