import type { Move } from '@playhex/move-notation';
import type { SolvePositionInput, SolvePositionOutput, SolveResult } from '../ai-jobs/protocol.js';
import { solveCacheKey } from '../ai-jobs/PositionSolveCache.js';
import { createNodeResolver, createParallelsFinder, findSolution, getComputerAnswer, getNodeResult, isElseNode, type NodeResolver, type PuzzleDefinition, type PuzzleNode } from '../../shared/app/puzzles/puzzleTree.js';
import { SOLVER_CHILDREN_MAX_TIME_SECONDS, SOLVER_MAX_JOBS, type PuzzleCheckWarning, type PuzzleCheckWarningCode } from '../../shared/app/puzzles/puzzleCheck.js';
import { createLimiter, getWinner, play, toColor, toSolveInput, type Position, type SolveClaim } from './puzzleCheckUtils.js';

export type PositionSolver = (input: SolvePositionInput) => Promise<SolvePositionOutput>;

export type PuzzleSolverCheckerOptions = {
    solve: PositionSolver;

    /**
     * Called each time a position is queued or solved.
     */
    onProgress?: (done: number, total: number) => void;

    /**
     * Max solves running at same time.
     */
    concurrency?: number;
};

/**
 * Checks puzzle tree with Mohex solver. Puzzle must be valid, see validatePuzzle().
 * Unlike katahex check, warnings are proven, and positions can be fictitious.
 *
 * Disabled cells are filled with stones depending on what is proven about puzzle player, see fillDisabledCells().
 * When result depends on disabled cells, nothing is proven and no warning is reported.
 *
 * Only checks main sequence, until puzzle ends, like katahex check.
 * Cannot tell whether a computer answer is the most resisting one: all answers lose when player move wins.
 *
 * @returns Warnings in tree order, empty if solver agrees with tree.
 *
 * @throws Errors from solve
 */
export const checkPuzzleWithSolver = async (puzzle: PuzzleDefinition, options: PuzzleSolverCheckerOptions): Promise<PuzzleCheckWarning[]> => {
    const { boardsize, playerColor, tree } = puzzle;
    const disabledCells = puzzle.disabledCells ?? [];
    const player = toColor(playerColor);
    const opponent = toColor(playerColor === 0 ? 1 : 0);
    const resolve: NodeResolver = createNodeResolver(tree);
    const findParallels = createParallelsFinder(tree);
    const limit = createLimiter(options.concurrency ?? 4);

    const solves = new Map<string, Promise<SolvePositionOutput>>();
    let done = 0;
    let budgetExceeded = false;

    /**
     * Results needed by a check, but not proven: check is partial.
     */
    const unproven = new Set<string>();

    /**
     * Solve keys known to be needed, from planning walk, and solves started.
     */
    const knownKeys = new Set<string>();
    const progressTotal = (): number => Math.min(knownKeys.size, SOLVER_MAX_JOBS);

    const toInput = ({ red, blue, toMove }: Position, claim: SolveClaim, children: boolean): SolvePositionInput => toSolveInput(
        { size: boardsize, color: toColor(toMove), black: red, white: blue, disabledCells },
        player,
        claim,
        children ? SOLVER_CHILDREN_MAX_TIME_SECONDS : undefined,
    );

    /**
     * Without disabled cells, both claims give same key, so position is solved once.
     */
    const solveKey = (position: Position, claim: SolveClaim, children: boolean): string =>
        solveCacheKey(toInput(position, claim, children));

    /**
     * Returns null when too many positions have been solved, then check is skipped.
     */
    const solve = (position: Position, claim: SolveClaim, children: boolean): null | Promise<SolvePositionOutput> => {
        const key = solveKey(position, claim, children);
        let solved = solves.get(key);

        if (solved !== undefined) {
            return solved;
        }

        if (solves.size >= SOLVER_MAX_JOBS) {
            budgetExceeded = true;
            return null;
        }

        const input = toInput(position, claim, children);

        solved = limit(() => options.solve(input)).then(output => {
            options.onProgress?.(++done, progressTotal());
            return output;
        });

        solves.set(key, solved);
        knownKeys.add(key);
        options.onProgress?.(done, progressTotal());

        return solved;
    };

    /**
     * Winner of a result, or null and marked as unproven.
     */
    const proven = (result: undefined | SolveResult, id: string): null | SolveResult => {
        if (result === undefined || result.winner === null) {
            unproven.add(id);
            return null;
        }

        return result;
    };

    const warn = (code: PuzzleCheckWarningCode, path: Move[], params: { [key: string]: string }, pv: string[], child?: number): PuzzleCheckWarning => ({
        code,
        path,
        ...(child === undefined ? {} : { child }),
        params: pv.length > 0 ? { ...params, pv: pv.join(' '), context: 'pv' } : params,
    });

    /**
     * Player to move, node is a player choice.
     */
    const checkPlayerChoice = async (node: PuzzleNode, path: Move[], position: Position): Promise<PuzzleCheckWarning[]> => {
        if (getWinner(boardsize, position) !== null) {
            return [];
        }

        const [winSolve, notWinSolve] = await Promise.all([
            solve(position, 'win', true),
            solve(position, 'notWin', true),
        ]);

        const positionId = path.join(' ');
        const children = node.children ?? [];
        const childMoves = new Set(children.flatMap(child => isElseNode(child) || !child.move ? [] : [child.move]));

        // Parallel sequences first moves are accepted moves too
        const parallelMoves = new Set(findParallels(node).flatMap(root => (root.children ?? []).flatMap(child => isElseNode(child) || !child.move ? [] : [child.move])));

        const isWinning = (move: Move): null | SolveResult => {
            if (winSolve === null) {
                return null;
            }

            const result = proven(winSolve.children?.[move], positionId + '|win|' + move);

            return result?.winner === player ? result : null;
        };

        const isLosing = (move: Move): null | SolveResult => {
            if (notWinSolve === null) {
                return null;
            }

            const result = proven(notWinSolve.children?.[move], positionId + '|notWin|' + move);

            return result?.winner === opponent ? result : null;
        };

        const warnings: PuzzleCheckWarning[] = [];

        // Winning moves the tree does not know.
        // Not proven ones are not reported as unproven: most cells are not in tree, and many are not proven in time.
        for (const [move, result] of Object.entries(winSolve?.children ?? {}) as [Move, SolveResult][]) {
            if (result.winner === player && !childMoves.has(move) && !parallelMoves.has(move)) {
                warnings.push(warn('solver_winning_move_rejected', path, { move }, result.pv));
            }
        }

        const checkChild = async (child: PuzzleNode, index: number): Promise<PuzzleCheckWarning[]> => {
            const move = child.move!;
            const childPath = [...path, move];
            const childPosition = play(position, move);

            // Transposition leaf has no children, but continues from its target
            const result = getNodeResult(resolve(child));

            // Failed move, or move without result but all its lines end as failed: computer shows a refutation
            if (result === 'failed' || (result === null && findSolution(child, resolve, true) === null)) {
                const winning = isWinning(move);

                return [
                    ...(winning === null ? [] : [warn('solver_winning_move_rejected', path, { move }, winning.pv, index)]),
                    ...(result === 'failed' ? [] : await checkComputerAnswer(child, childPath, childPosition)),
                ];
            }

            if (result === 'solved') {
                const losing = isLosing(move);

                return losing === null
                    ? []
                    : [warn('solver_solved_not_won', childPath, {}, losing.pv)]
                ;
            }

            const losing = isLosing(move);

            return [
                ...(losing === null ? [] : [warn('solver_accepted_move_not_winning', childPath, { move }, losing.pv)]),
                ...await checkComputerAnswer(child, childPath, childPosition),
            ];
        };

        const childrenWarnings = await Promise.all(children.map((child, index) => isElseNode(child) || !child.move
            ? Promise.resolve([])
            : checkChild(child, index),
        ));

        return [...warnings, ...childrenWarnings.flat()];
    };

    /**
     * Computer to move, after player move node.
     */
    const checkComputerAnswer = async (playerMoveNode: PuzzleNode, path: Move[], position: Position): Promise<PuzzleCheckWarning[]> => {
        // Transposition leaf: continues from another node, checked there
        const node = resolve(playerMoveNode);

        if (node !== playerMoveNode) {
            return [];
        }

        const answer = getComputerAnswer(node);

        if (answer === null || answer.move === undefined || resolve(answer) !== answer) {
            return [];
        }

        const answerPath = [...path, answer.move];
        const answerPosition = play(position, answer.move);
        const result = getNodeResult(answer);

        if (result === 'failed') {
            return [];
        }

        if (result === 'solved') {
            if (getWinner(boardsize, answerPosition) !== null) {
                return [];
            }

            const output = await solve(answerPosition, 'notWin', false);

            if (output === null) {
                return [];
            }

            return proven(output, answerPath.join(' '))?.winner === opponent
                ? [warn('solver_solved_not_won', answerPath, {}, output.pv)]
                : []
            ;
        }

        return await checkPlayerChoice(answer, answerPath, answerPosition);
    };

    const initialPosition: Position = {
        red: puzzle.redStones,
        blue: puzzle.blueStones,
        toMove: playerColor,
    };

    /**
     * Same walk as checks above, but only collects positions to solve,
     * to know progress total from start.
     */
    const planPlayerChoice = (node: PuzzleNode, position: Position): void => {
        if (getWinner(boardsize, position) !== null) {
            return;
        }

        knownKeys.add(solveKey(position, 'win', true));
        knownKeys.add(solveKey(position, 'notWin', true));

        for (const child of node.children ?? []) {
            if (isElseNode(child) || !child.move) {
                continue;
            }

            const result = getNodeResult(resolve(child));

            if (result === null) {
                planComputerAnswer(child, play(position, child.move));
            }
        }
    };

    const planComputerAnswer = (playerMoveNode: PuzzleNode, position: Position): void => {
        const answer = getComputerAnswer(playerMoveNode);

        if (resolve(playerMoveNode) !== playerMoveNode || answer === null || answer.move === undefined || resolve(answer) !== answer) {
            return;
        }

        const answerPosition = play(position, answer.move);
        const result = getNodeResult(answer);

        if (result === 'solved' && getWinner(boardsize, answerPosition) === null) {
            knownKeys.add(solveKey(answerPosition, 'notWin', false));
        } else if (result === null) {
            planPlayerChoice(answer, answerPosition);
        }
    };

    planPlayerChoice(tree, initialPosition);
    options.onProgress?.(0, progressTotal());

    const [initialSolve, treeWarnings] = await Promise.all([
        getWinner(boardsize, initialPosition) === null ? solve(initialPosition, 'notWin', true) : null,
        checkPlayerChoice(tree, [], initialPosition),
    ]);

    const warnings: PuzzleCheckWarning[] = [];

    if (initialSolve !== null && proven(initialSolve, 'initial')?.winner === opponent) {
        warnings.push(warn('solver_initial_not_winning', [], {}, initialSolve.pv));
    }

    warnings.push(...treeWarnings);

    if (unproven.size > 0) {
        warnings.push({ code: 'solver_unproven', params: { count: unproven.size } });
    }

    if (budgetExceeded) {
        warnings.push({ code: 'solver_too_many_positions', params: { max: SOLVER_MAX_JOBS } });
    }

    return warnings;
};
