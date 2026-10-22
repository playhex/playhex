import type { Move } from '@playhex/move-notation';
import { analysisCacheKey, type AnalysisInput, type AnalysisOutput } from '../../shared/app/hexplorer.js';
import { createNodeResolver, createParallelsFinder, findElseNode, findSolution, getComputerAnswers, getFirstColor, getNodeResult, isElseNode, type NodeResolver, type PuzzleDefinition, type PuzzleNode } from '../../shared/app/puzzles/puzzleTree.js';
import { createLimiter, getPolicyCandidates, getWinner, play, toColor, type Position } from './puzzleCheckUtils.js';
import { fillForKatahex, getEdgePaths } from '../../shared/app/puzzles/edgeConnections.js';
import { KATAHEX_COMPUTER_ALTERNATIVES, KATAHEX_COMPUTER_DELTA, KATAHEX_INITIAL_WIN_THRESHOLD, KATAHEX_MAX_PLAUSIBLE_MOVES, KATAHEX_MAX_POSITIONS, KATAHEX_PLAUSIBLE_POLICY_RATIO, KATAHEX_WIN_THRESHOLD, type PuzzleCheckWarning, type PuzzleCheckWarningCode } from '../../shared/app/puzzles/puzzleCheck.js';

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

const percent = (value: number): number => Math.round(value * 100);

/**
 * Checks puzzle tree with katahex. Puzzle must be valid, see validatePuzzle().
 *
 * Only checks main sequence, until puzzle ends: continuations, transposition leaves
 * and parallel sequences are ignored, but parallel sequences first moves are not reported as uncovered.
 * Disabled cells are never considered as candidate moves,
 * and are sent to katahex filled as to prove player wins, with as many red as blue stones, see fillDisabledCells() and balanceFilledStones().
 *
 * @returns Warnings in tree order, empty if katahex agrees with tree.
 *
 * @throws Errors from analyze
 */
export const checkPuzzleWithKatahex = async (puzzle: PuzzleDefinition, options: PuzzleKatahexCheckerOptions): Promise<PuzzleCheckWarning[]> => {
    const { boardsize, playerColor, tree } = puzzle;
    const computerPlaysFirst = puzzle.computerPlaysFirst ?? false;
    const disabledCells = new Set(puzzle.disabledCells ?? []);
    const edgePaths = getEdgePaths({ boardsize, redStones: puzzle.redStones, blueStones: puzzle.blueStones, disabledCells: [...disabledCells], fixedFill: puzzle.fixedFill }, puzzle.edgeConnections);
    const resolve: NodeResolver = createNodeResolver(tree);
    const findParallels = createParallelsFinder(tree);
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

    const fill = ({ red, blue }: Position): { black: Move[], white: Move[] } =>
        fillForKatahex(red, blue, [...disabledCells], toColor(playerColor), edgePaths, puzzle.fixedFill);

    const toInput = (position: Position): Omit<AnalysisInput, 'engine'> => ({
        size: boardsize,
        color: position.toMove === 0 ? 'black' : 'white',
        ...fill(position),
    });

    /**
     * Winner of position as sent to katahex: filled disabled cells can already connect a player,
     * e.g opponent stones across the board when no stone is connected to its edge.
     * Katahex returns no move on such position.
     */
    const getFilledWinner = (position: Position): null | 0 | 1 => {
        const { black, white } = fill(position);

        return getWinner(boardsize, { red: black, blue: white, toMove: position.toMove });
    };

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

    /**
     * Player winrate in this position, or null if not analyzed.
     */
    const playerWinrate = async (position: Position): Promise<null | number> => {
        const winner = getFilledWinner(position);

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
        if (getFilledWinner(position) !== null) {
            return [];
        }

        const policy = (await analyze(position, 'policy'))?.policy;

        if (!policy) {
            return [];
        }

        return getPolicyCandidates(policy, boardsize, new Set([...position.red, ...position.blue]), disabledCells);
    };

    const warn = (code: PuzzleCheckWarningCode, path: Move[], params: PuzzleCheckWarning['params'], child?: number): PuzzleCheckWarning => ({
        code,
        path,
        ...(child === undefined ? {} : { child }),
        params,
    });

    /**
     * Compares computer move to best computer moves by policy.
     *
     * @param treeMoves Other computer answers in tree, not compared as they are already played as alternatives
     *
     * @returns Player winrate after computer move, and warning params if a better move exists
     */
    const checkComputerMove = async (position: Position, computerMove: Move, treeMoves: Move[] = []): Promise<{ answerWinrate: null | number, warning: null | Record<string, string | number> }> => {
        const alternatives = (await candidateMoves(position))
            .filter(candidate => candidate.move !== computerMove && !treeMoves.includes(candidate.move))
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
    const checkPlayerChoice = async (node: PuzzleNode, path: Move[], position: Position): Promise<PuzzleCheckWarning[]> => {
        const children = node.children ?? [];
        const childMoves = new Set(children.flatMap(child => isElseNode(child) || !child.move ? [] : [child.move]));

        // Parallel sequences first moves are accepted moves too, not to be reported as uncovered
        const parallelMoves = new Set(findParallels(node).flatMap(root => (root.children ?? []).flatMap(child => isElseNode(child) || !child.move ? [] : [child.move])));
        const elseNode = findElseNode(node);
        const hasElse = elseNode !== null;

        const checkChild = async (child: PuzzleNode, index: number): Promise<PuzzleCheckWarning[]> => {
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
                    ...await checkComputerAnswers(child, childPath, childPosition),
                ];
            }

            return [
                ...(winrate !== null && winrate < KATAHEX_WIN_THRESHOLD
                    ? [warn('katahex_accepted_move_not_winning', childPath, { move, winrate: percent(winrate) })]
                    : []
                ),
                ...await checkComputerAnswers(child, childPath, childPosition),
            ];
        };

        const checkPlausibleMove = async ({ move, policy }: { move: Move, policy: number }): Promise<PuzzleCheckWarning[]> => {
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
            .filter(candidate => !childMoves.has(candidate.move) && !parallelMoves.has(candidate.move))
        ;

        const plausibleMoves = uncoveredMoves
            .filter(candidate => candidate.policy >= plausiblePolicy)
            .slice(0, KATAHEX_MAX_PLAUSIBLE_MOVES)
        ;

        /**
         * "else" answer must be good against any move, checks it against most likely uncovered move.
         */
        const checkElseAnswer = async (): Promise<PuzzleCheckWarning[]> => {
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
     * Computer to move, after player move node, or on root when computer plays first.
     * Checks all computer answers, alternatives included.
     */
    const checkComputerAnswers = async (playerMoveNode: PuzzleNode, path: Move[], position: Position): Promise<PuzzleCheckWarning[]> => {
        // Transposition leaf: continues from another node, checked there
        const node = resolve(playerMoveNode);

        if (node !== playerMoveNode) {
            return [];
        }

        const answers = getComputerAnswers(node);
        const answerMoves = answers.flatMap(answer => answer.move === undefined ? [] : [answer.move]);

        const results = await Promise.all(answers.map(answer => checkComputerAnswer(answer, answerMoves, path, position)));

        return results.flat();
    };

    const checkComputerAnswer = async (answer: PuzzleNode, answerMoves: Move[], path: Move[], position: Position): Promise<PuzzleCheckWarning[]> => {
        if (answer.move === undefined) {
            return [];
        }

        const answerPath = [...path, answer.move];
        const answerPosition = play(position, answer.move);

        const { answerWinrate, warning } = await checkComputerMove(position, answer.move, answerMoves);
        const warnings: PuzzleCheckWarning[] = warning === null
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
        toMove: getFirstColor(puzzle),
    };

    /**
     * Same walk as checks below, but only collects tree positions to analyze,
     * to know progress total from start.
     */
    const planValue = (position: Position): void => {
        if (getFilledWinner(position) === null) {
            knownKeys.add(analysisKey(position, 'value'));
        }
    };

    const planPlayerChoice = (node: PuzzleNode, position: Position): void => {
        if (getFilledWinner(position) === null) {
            knownKeys.add(analysisKey(position, 'policy'));
        }

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
        const answers = getComputerAnswers(playerMoveNode);

        if (resolve(playerMoveNode) !== playerMoveNode || answers.length === 0) {
            return;
        }

        knownKeys.add(analysisKey(position, 'policy'));

        for (const answer of answers) {
            if (answer.move === undefined) {
                continue;
            }

            const answerPosition = play(position, answer.move);

            planValue(answerPosition);

            if (resolve(answer) === answer && getNodeResult(answer) === null) {
                planPlayerChoice(answer, answerPosition);
            }
        }
    };

    planValue(initialPosition);

    if (computerPlaysFirst) {
        planComputerAnswer(tree, initialPosition);
    } else {
        planPlayerChoice(tree, initialPosition);
    }

    options.onProgress?.(0, progressTotal());

    const [initialWinrate, treeWarnings] = await Promise.all([
        playerWinrate(initialPosition),
        computerPlaysFirst
            ? checkComputerAnswers(tree, [], initialPosition)
            : checkPlayerChoice(tree, [], initialPosition),
    ]);

    const warnings: PuzzleCheckWarning[] = [];

    if (initialWinrate !== null && initialWinrate < KATAHEX_INITIAL_WIN_THRESHOLD) {
        warnings.push(warn('katahex_initial_not_winning', [], { winrate: percent(initialWinrate) }));
    }

    warnings.push(...treeWarnings);

    if (budgetExceeded) {
        warnings.push({ code: 'katahex_too_many_positions', params: { max: KATAHEX_MAX_POSITIONS } });
    }

    return warnings;
};
