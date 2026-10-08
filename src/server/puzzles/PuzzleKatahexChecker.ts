import { coordsToMove, type Move } from '@playhex/move-notation';
import Board from '../../shared/game-engine/Board.js';
import { analysisCacheKey, type AnalysisInput, type AnalysisOutput } from '../../shared/app/hexplorer.js';
import { createNodeResolver, findElseNode, findSolution, getComputerAnswer, getNodeResult, isElseNode, type NodeResolver, type PuzzleDefinition, type PuzzleNode } from '../../shared/app/puzzles/puzzleTree.js';
import { KATAHEX_COMPUTER_ALTERNATIVES, KATAHEX_COMPUTER_DELTA, KATAHEX_INITIAL_WIN_THRESHOLD, KATAHEX_MAX_PLAUSIBLE_MOVES, KATAHEX_MAX_POSITIONS, KATAHEX_PLAUSIBLE_POLICY_RATIO, KATAHEX_WIN_THRESHOLD, type PuzzleKatahexWarning, type PuzzleKatahexWarningCode } from '../../shared/app/puzzles/puzzleKatahexCheck.js';

/**
 * What an analyze is used for:
 * - policy: to find plausible moves, raw policy is better as MCTS visits are too concentrated,
 * - value: to get winrate, from the engine chosen by user.
 */
export type AnalysisPurpose = 'policy' | 'value';

/**
 * Analyzes a position with katahex. Engine is chosen by caller from purpose.
 */
export type PositionAnalyzer = (input: Omit<AnalysisInput, 'engine'>, purpose: AnalysisPurpose) => Promise<AnalysisOutput>;

export type PuzzleKatahexCheckerOptions = {
    analyze: PositionAnalyzer;

    /**
     * Called each time a position is queued or analyzed.
     */
    onProgress?: (done: number, total: number) => void;

    /**
     * Max analyzes running at same time.
     */
    concurrency?: number;
};

type Position = {
    red: Move[];
    blue: Move[];
    toMove: 0 | 1;
};

const play = ({ red, blue, toMove }: Position, move: Move): Position => ({
    red: toMove === 0 ? [...red, move] : red,
    blue: toMove === 1 ? [...blue, move] : blue,
    toMove: toMove === 0 ? 1 : 0,
});

const percent = (value: number): number => Math.round(value * 100);

/**
 * Runs at most `concurrency` tasks at same time.
 */
const createLimiter = (concurrency: number) => {
    let running = 0;
    const waiting: (() => void)[] = [];

    return async <T>(task: () => Promise<T>): Promise<T> => {
        if (running >= concurrency) {
            await new Promise<void>(resolve => waiting.push(resolve));
        }

        ++running;

        try {
            return await task();
        } finally {
            --running;
            waiting.shift()?.();
        }
    };
};

/**
 * Checks puzzle tree with katahex. Puzzle must be valid, see validatePuzzle().
 *
 * Only checks main sequence, until puzzle ends: continuations, transposition leaves
 * and parallel sequences are ignored. Disabled cells are never considered as candidate moves.
 *
 * @returns Warnings in tree order, empty if katahex agrees with tree.
 *
 * @throws Errors from analyze
 */
export const checkPuzzleWithKatahex = async (puzzle: PuzzleDefinition, options: PuzzleKatahexCheckerOptions): Promise<PuzzleKatahexWarning[]> => {
    const { boardsize, playerColor, tree } = puzzle;
    const disabledCells = new Set(puzzle.disabledCells ?? []);
    const resolve: NodeResolver = createNodeResolver(tree);
    const limit = createLimiter(options.concurrency ?? 4);

    const analyzes = new Map<string, Promise<AnalysisOutput>>();
    let done = 0;
    let budgetExceeded = false;

    /**
     * Analyzes keys known to be needed: tree positions planned at start, and analyzes started.
     * Used as progress total, which increases only with positions found by policy.
     */
    const knownKeys = new Set<string>();
    const progressTotal = (): number => Math.min(knownKeys.size, KATAHEX_MAX_POSITIONS);

    const toInput = ({ red, blue, toMove }: Position): Omit<AnalysisInput, 'engine'> => ({
        size: boardsize,
        color: toMove === 0 ? 'black' : 'white',
        black: red,
        white: blue,
    });

    /**
     * Analyzes position once per purpose.
     * Returns null when too many positions have been analyzed, then check is skipped.
     */
    const analysisKey = (position: Position, purpose: AnalysisPurpose): string =>
        purpose + ':' + analysisCacheKey(toInput(position));

    const analyze = (position: Position, purpose: AnalysisPurpose): null | Promise<AnalysisOutput> => {
        const input = toInput(position);
        const key = analysisKey(position, purpose);
        let analysis = analyzes.get(key);

        if (analysis !== undefined) {
            return analysis;
        }

        if (analyzes.size >= KATAHEX_MAX_POSITIONS) {
            budgetExceeded = true;
            return null;
        }

        analysis = limit(() => options.analyze(input, purpose)).then(output => {
            options.onProgress?.(++done, progressTotal());
            return output;
        });

        analyzes.set(key, analysis);
        knownKeys.add(key);
        options.onProgress?.(done, progressTotal());

        return analysis;
    };

    const getWinner = ({ red, blue }: Position): null | 0 | 1 => {
        const board = new Board(boardsize);

        red.forEach(move => board.setCell(move, 0));
        blue.forEach(move => board.setCell(move, 1));

        return board.calculateWinner();
    };

    /**
     * Player winrate in this position, or null if not analyzed.
     */
    const playerWinrate = async (position: Position): Promise<null | number> => {
        const winner = getWinner(position);

        if (winner !== null) {
            return winner === playerColor ? 1 : 0;
        }

        const whiteWin = (await analyze(position, 'value'))?.whiteWin;

        if (whiteWin === undefined) {
            return null;
        }

        return playerColor === 1 ? whiteWin : 1 - whiteWin;
    };

    /**
     * Moves katahex would play in this position, best first, with their normalized policy.
     * Occupied and disabled cells are excluded.
     */
    const candidateMoves = async (position: Position): Promise<{ move: Move, policy: number }[]> => {
        const policy = (await analyze(position, 'policy'))?.policy;

        if (!policy) {
            return [];
        }

        const occupied = new Set([...position.red, ...position.blue]);
        const candidates: { move: Move, policy: number }[] = [];
        let total = 0;

        policy.forEach((line, row) => line.forEach((value, col) => {
            const move = coordsToMove({ row, col });

            if (row >= boardsize || col >= boardsize || occupied.has(move) || !(value > 0)) {
                return;
            }

            total += value;

            if (!disabledCells.has(move)) {
                candidates.push({ move, policy: value });
            }
        }));

        return candidates
            .map(candidate => ({ ...candidate, policy: candidate.policy / total }))
            .sort((a, b) => b.policy - a.policy)
        ;
    };

    const warn = (code: PuzzleKatahexWarningCode, path: Move[], params: PuzzleKatahexWarning['params'], child?: number): PuzzleKatahexWarning => ({
        code,
        path,
        ...(child === undefined ? {} : { child }),
        params,
    });

    /**
     * Compares computer move to best computer moves by policy.
     *
     * @returns Player winrate after computer move, and warning params if a better move exists
     */
    const checkComputerMove = async (position: Position, computerMove: Move): Promise<{ answerWinrate: null | number, warning: null | Record<string, string | number> }> => {
        const alternatives = (await candidateMoves(position))
            .filter(candidate => candidate.move !== computerMove)
            .slice(0, KATAHEX_COMPUTER_ALTERNATIVES)
        ;

        const [answerWinrate, ...alternativeWinrates] = await Promise.all([
            playerWinrate(play(position, computerMove)),
            ...alternatives.map(({ move }) => playerWinrate(play(position, move))),
        ]);

        // Best computer alternative is the one with lowest player winrate
        const best = alternatives
            .map(({ move }, index) => ({ move, winrate: alternativeWinrates[index] }))
            .filter((alternative): alternative is { move: Move, winrate: number } => alternative.winrate !== null)
            .sort((a, b) => a.winrate - b.winrate)
            [0]
        ;

        if (answerWinrate === null || best === undefined || answerWinrate - best.winrate <= KATAHEX_COMPUTER_DELTA) {
            return { answerWinrate, warning: null };
        }

        return {
            answerWinrate,
            warning: {
                move: computerMove,
                winrate: percent(1 - answerWinrate),
                best: best.move,
                bestWinrate: percent(1 - best.winrate),
            },
        };
    };

    /**
     * Player to move, node is a player choice.
     */
    const checkPlayerChoice = async (node: PuzzleNode, path: Move[], position: Position): Promise<PuzzleKatahexWarning[]> => {
        const children = node.children ?? [];
        const childMoves = new Set(children.flatMap(child => isElseNode(child) || !child.move ? [] : [child.move]));
        const elseNode = findElseNode(node);
        const hasElse = elseNode !== null;

        const checkChild = async (child: PuzzleNode, index: number): Promise<PuzzleKatahexWarning[]> => {
            const move = child.move!;
            const childPosition = play(position, move);
            const winrate = await playerWinrate(childPosition);

            // Transposition leaf has no children, but continues from its target
            const result = getNodeResult(resolve(child));

            if (result === 'failed') {
                return winrate !== null && winrate >= KATAHEX_WIN_THRESHOLD
                    ? [warn('katahex_winning_move_rejected', path, { move, winrate: percent(winrate) }, index)]
                    : []
                ;
            }

            const childPath = [...path, move];

            if (result === 'solved') {
                return winrate !== null && winrate < KATAHEX_WIN_THRESHOLD
                    ? [warn('katahex_solved_not_won', childPath, { winrate: percent(winrate) })]
                    : []
                ;
            }

            // Move without result, but all its lines end as failed: computer shows a refutation
            if (findSolution(child, resolve, true) === null) {
                return [
                    ...(winrate !== null && winrate >= KATAHEX_WIN_THRESHOLD
                        ? [warn('katahex_winning_move_rejected', path, { move, winrate: percent(winrate) }, index)]
                        : []
                    ),
                    ...await checkComputerAnswer(child, childPath, childPosition),
                ];
            }

            return [
                ...(winrate !== null && winrate < KATAHEX_WIN_THRESHOLD
                    ? [warn('katahex_accepted_move_not_winning', childPath, { move, winrate: percent(winrate) })]
                    : []
                ),
                ...await checkComputerAnswer(child, childPath, childPosition),
            ];
        };

        const checkPlausibleMove = async ({ move, policy }: { move: Move, policy: number }): Promise<PuzzleKatahexWarning[]> => {
            const winrate = await playerWinrate(play(position, move));

            if (winrate !== null && winrate >= KATAHEX_WIN_THRESHOLD) {
                return [warn('katahex_winning_move_rejected', path, { move, winrate: percent(winrate), policy: percent(policy) })];
            }

            if (!hasElse) {
                return [warn('katahex_uncovered_move', path, { move, policy: percent(policy) })];
            }

            return [];
        };

        const candidates = await candidateMoves(position);
        const plausiblePolicy = (candidates[0]?.policy ?? 0) * KATAHEX_PLAUSIBLE_POLICY_RATIO;
        const uncoveredMoves = candidates
            .filter(candidate => !childMoves.has(candidate.move))
        ;

        const plausibleMoves = uncoveredMoves
            .filter(candidate => candidate.policy >= plausiblePolicy)
            .slice(0, KATAHEX_MAX_PLAUSIBLE_MOVES)
        ;

        /**
         * "else" answer must be good against any move, checks it against most likely uncovered move.
         */
        const checkElseAnswer = async (): Promise<PuzzleKatahexWarning[]> => {
            const playerMove = uncoveredMoves.find(candidate => candidate.move !== elseNode?.else)?.move;

            if (elseNode === null || playerMove === undefined) {
                return [];
            }

            const { warning } = await checkComputerMove(play(position, playerMove), elseNode.else);

            return warning === null
                ? []
                : [warn('katahex_else_better_move', path, { ...warning, playerMove }, children.length - 1)]
            ;
        };

        const results = await Promise.all([
            ...plausibleMoves.map(checkPlausibleMove),
            checkElseAnswer(),
            ...children.map((child, index) => isElseNode(child) || !child.move
                ? []
                : checkChild(child, index),
            ),
        ]);

        return results.flat();
    };

    /**
     * Computer to move, after player move node.
     */
    const checkComputerAnswer = async (playerMoveNode: PuzzleNode, path: Move[], position: Position): Promise<PuzzleKatahexWarning[]> => {
        // Transposition leaf: continues from another node, checked there
        const node = resolve(playerMoveNode);

        if (node !== playerMoveNode) {
            return [];
        }

        const answer = getComputerAnswer(node);

        if (answer === null || answer.move === undefined) {
            return [];
        }

        const answerPath = [...path, answer.move];
        const answerPosition = play(position, answer.move);

        const { answerWinrate, warning } = await checkComputerMove(position, answer.move);
        const warnings: PuzzleKatahexWarning[] = warning === null
            ? []
            : [warn('katahex_computer_better_move', answerPath, warning)]
        ;

        const answerNode = resolve(answer);

        if (answerNode !== answer) {
            return warnings;
        }

        const result = getNodeResult(answer);

        if (result === 'solved') {
            if (answerWinrate !== null && answerWinrate < KATAHEX_WIN_THRESHOLD) {
                warnings.push(warn('katahex_solved_not_won', answerPath, { winrate: percent(answerWinrate) }));
            }

            return warnings;
        }

        if (result === 'failed') {
            return warnings;
        }

        return [...warnings, ...await checkPlayerChoice(answer, answerPath, answerPosition)];
    };

    const initialPosition: Position = {
        red: puzzle.redStones,
        blue: puzzle.blueStones,
        toMove: playerColor,
    };

    /**
     * Same walk as checks below, but only collects tree positions to analyze,
     * to know progress total from start.
     */
    const planValue = (position: Position): void => {
        if (getWinner(position) === null) {
            knownKeys.add(analysisKey(position, 'value'));
        }
    };

    const planPlayerChoice = (node: PuzzleNode, position: Position): void => {
        knownKeys.add(analysisKey(position, 'policy'));

        for (const child of node.children ?? []) {
            if (isElseNode(child) || !child.move) {
                continue;
            }

            const childPosition = play(position, child.move);
            planValue(childPosition);

            if (getNodeResult(resolve(child)) === null) {
                planComputerAnswer(child, childPosition);
            }
        }
    };

    const planComputerAnswer = (playerMoveNode: PuzzleNode, position: Position): void => {
        const answer = getComputerAnswer(playerMoveNode);

        if (resolve(playerMoveNode) !== playerMoveNode || answer === null || answer.move === undefined) {
            return;
        }

        const answerPosition = play(position, answer.move);

        knownKeys.add(analysisKey(position, 'policy'));
        planValue(answerPosition);

        if (resolve(answer) === answer && getNodeResult(answer) === null) {
            planPlayerChoice(answer, answerPosition);
        }
    };

    planValue(initialPosition);
    planPlayerChoice(tree, initialPosition);
    options.onProgress?.(0, progressTotal());

    const [initialWinrate, treeWarnings] = await Promise.all([
        playerWinrate(initialPosition),
        checkPlayerChoice(tree, [], initialPosition),
    ]);

    const warnings: PuzzleKatahexWarning[] = [];

    if (initialWinrate !== null && initialWinrate < KATAHEX_INITIAL_WIN_THRESHOLD) {
        warnings.push(warn('katahex_initial_not_winning', [], { winrate: percent(initialWinrate) }));
    }

    warnings.push(...treeWarnings);

    if (budgetExceeded) {
        warnings.push({ code: 'katahex_too_many_positions', params: { max: KATAHEX_MAX_POSITIONS } });
    }

    return warnings;
};
