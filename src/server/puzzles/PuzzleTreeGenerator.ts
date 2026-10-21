import { coordsToMove, parseMove, validateMove, type Move } from '@playhex/move-notation';
import type { SolvePositionOutput, SolveResult } from '../ai-jobs/protocol.js';
import { solveCacheKey } from '../ai-jobs/PositionSolveCache.js';
import { analysisCacheKey, type AnalysisInput, type AnalysisOutput } from '../../shared/app/hexplorer.js';
import { collectCells, createParallelsFinder, findTranspositions, getFirstColor, getPositionKey, isElseNode, puzzleErrorToString, PUZZLE_MAX_NODES, validatePuzzle, type PuzzleElseNode, type PuzzleNode } from '../../shared/app/puzzles/puzzleTree.js';
import { KATAHEX_MAX_PLAUSIBLE_MOVES, KATAHEX_PLAUSIBLE_POLICY_RATIO, SOLVER_CHILDREN_MAX_TIME_SECONDS } from '../../shared/app/puzzles/puzzleCheck.js';
import { findGenerateStartNode, GENERATOR_COMPUTER_CANDIDATES, GENERATOR_MAX_PLAUSIBLE_FAILURES, GENERATOR_MAX_SOLVES, type PuzzleGenerateInput, type PuzzleGenerateOutput, type PuzzleGenerateWarning, type PuzzleGenerateWarningCode } from '../../shared/app/puzzles/puzzleGenerate.js';
import { findTemplateConnection, findTemplateInstances } from '../../shared/hex-templates/template-connection.js';
import { getColorEdgeConnections } from '../../shared/app/puzzles/edgeConnections.js';
import { createLimiter, getPolicyCandidates, play, toColor, toSolveInput, type Position, type SolveClaim } from './puzzleCheckUtils.js';
import type { PositionSolver } from './PuzzleSolverChecker.js';

/**
 * Katahex policy of a position, to find plausible moves.
 */
export type PolicyAnalyzer = (input: Omit<AnalysisInput, 'engine'>) => Promise<AnalysisOutput>;

export type PuzzleTreeGeneratorOptions = {
    solve: PositionSolver;

    /**
     * Null when katahex is not available: no failed nodes,
     * and computer answers are the ones from solver proofs.
     */
    analyze: null | PolicyAnalyzer;

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
 * Opponent bridge the player can intrude, opponent answering in the other carrier cell.
 */
type BridgeIntrusions = {
    key: string;

    /**
     * Player intrusion and computer answer, for each winning intrusion.
     */
    sequences: [Move, Move][];
};

const countNodes = (node: PuzzleNode): number => [...node.children ?? [], ...node.parallel ?? []]
    .reduce((count, child) => count + 1 + (isElseNode(child) ? 0 : countNodes(child)), 0);

/**
 * Generates children and parallel sequences of a node, with Mohex solver, see PuzzleGenerateInput.
 *
 * - player choice: proven winning moves are accepted, plausible (katahex policy) proven losing moves fail
 *   and are followed by a refutation from solver, other moves are answered by an "else" node.
 *   Winning intrusions in an opponent bridge are parallel sequences instead of main moves.
 * - computer answer: among best katahex moves, the one leaving player the fewest winning answers.
 *
 * Puzzle ends once player is connected with acquired templates, see findTemplateConnection().
 * Nodes that could not be generated (not proven, budget exceeded) are left without children, and warned.
 *
 * @throws {Error} If fromPath does not reach a node to generate from
 * @throws Errors from solve and analyze
 */
export const generatePuzzleTree = async (input: PuzzleGenerateInput, options: PuzzleTreeGeneratorOptions): Promise<PuzzleGenerateOutput> => {
    const { puzzle, fromPath, templateIds, refutationLength } = input;
    const { boardsize, playerColor } = puzzle;
    const disabledCells = puzzle.disabledCells ?? [];
    const player = toColor(playerColor);
    const opponent = toColor(playerColor === 0 ? 1 : 0);
    const limit = createLimiter(options.concurrency ?? 4);

    const tree = structuredClone(puzzle.tree);
    const start = findGenerateStartNode(tree, fromPath);

    if (start === null) {
        throw new Error(`Cannot generate from "${fromPath.join(' ')}"`);
    }

    const warnings: PuzzleGenerateWarning[] = [];

    const warn = (code: PuzzleGenerateWarningCode, path: Move[], params?: PuzzleGenerateWarning['params']): void => {
        warnings.push({ code, path, ...(params === undefined ? {} : { params }) });
    };

    // Parallel sequences declared above start node: generated moves must not use their cells
    const parent = fromPath.length > 0 ? findGenerateStartNode(tree, fromPath.slice(0, -1)) : null;
    const inheritedParallels = parent === null ? [] : createParallelsFinder(tree)(parent);
    const inheritedCells = collectCells({ parallel: inheritedParallels }) as Set<Move>;

    delete start.children;
    delete start.parallel;

    let remainingNodes = PUZZLE_MAX_NODES - countNodes(tree);

    const reserveNodes = (count: number): boolean => {
        if (remainingNodes < count) {
            return false;
        }

        remainingNodes -= count;

        return true;
    };

    /*
     * Solver and katahex, deduplicated
     */

    const solves = new Map<string, Promise<SolvePositionOutput>>();
    let solved = 0;

    const solve = (position: Position, claim: SolveClaim, children: boolean): null | Promise<SolvePositionOutput> => {
        const solveInput = toSolveInput(
            { size: boardsize, color: toColor(position.toMove), black: position.red, white: position.blue, disabledCells, edgeConnections: puzzle.edgeConnections },
            player,
            claim,
            children ? SOLVER_CHILDREN_MAX_TIME_SECONDS : undefined,
        );

        const key = solveCacheKey(solveInput);
        let output = solves.get(key);

        if (output !== undefined) {
            return output;
        }

        if (solves.size >= GENERATOR_MAX_SOLVES) {
            return null;
        }

        output = limit(() => options.solve(solveInput)).then(result => {
            options.onProgress?.(++solved, solves.size);
            return result;
        });

        solves.set(key, output);
        options.onProgress?.(solved, solves.size);

        return output;
    };

    const analyzes = new Map<string, Promise<AnalysisOutput>>();

    /**
     * Moves katahex would play, best first. Empty without katahex.
     */
    const candidateMoves = async (position: Position): Promise<{ move: Move, policy: number }[]> => {
        const { analyze } = options;

        if (analyze === null) {
            return [];
        }

        const analysisInput = { size: boardsize, color: toColor(position.toMove), black: position.red, white: position.blue };
        const key = analysisCacheKey(analysisInput);
        let analysis = analyzes.get(key);

        if (analysis === undefined) {
            analysis = limit(() => analyze(analysisInput));
            analyzes.set(key, analysis);
        }

        const { policy } = await analysis;

        if (!policy) {
            return [];
        }

        return getPolicyCandidates(policy, boardsize, new Set([...position.red, ...position.blue]), new Set([...disabledCells, ...inheritedCells]));
    };

    /*
     * Position helpers
     */

    const playerStones = (position: Position): Move[] => playerColor === 0 ? position.red : position.blue;
    const opponentStones = (position: Position): Move[] => playerColor === 0 ? position.blue : position.red;

    const opponentColor = playerColor === 0 ? 1 : 0;
    const initialStones = { redStones: puzzle.redStones, blueStones: puzzle.blueStones };

    /**
     * Whether color is connected, with these templates and its stones connected to edge.
     */
    const isConnected = (position: Position, color: 0 | 1, connectionTemplateIds: string[]): boolean => findTemplateConnection({
        boardsize,
        own: color === 0 ? position.red : position.blue,
        opponent: color === 0 ? position.blue : position.red,
        disabledCells,
        color,
        templateIds: connectionTemplateIds,
        edgeConnections: getColorEdgeConnections(initialStones, puzzle.edgeConnections, color),
    }) !== null;

    const isOpponentConnected = (position: Position): boolean => isConnected(position, opponentColor, []);

    const isPuzzleEnded = (position: Position): boolean =>
        isOpponentConnected(position) || isConnected(position, playerColor, templateIds);

    const emptyCells = (position: Position): Move[] => {
        const unavailable = new Set<Move>([...position.red, ...position.blue, ...disabledCells, ...inheritedCells]);
        const cells: Move[] = [];

        for (let row = 0; row < boardsize; ++row) {
            for (let col = 0; col < boardsize; ++col) {
                const move = coordsToMove({ row, col });

                if (!unavailable.has(move)) {
                    cells.push(move);
                }
            }
        }

        return cells;
    };

    /**
     * Winning intrusions in opponent bridges, by intrusion move.
     */
    const findBridgeIntrusions = (position: Position, winning: Map<Move, SolveResult>): Map<Move, BridgeIntrusions> => {
        const bridges = findTemplateInstances({
            boardsize,
            own: opponentStones(position),
            opponent: playerStones(position),
            disabledCells,
            color: opponentColor,
            templateIds: ['bridge'],
        });

        const intrusions = new Map<Move, BridgeIntrusions>();

        for (const { carrier } of bridges) {
            const [a, b] = carrier;
            const bridge: BridgeIntrusions = {
                key: [...carrier].sort().join(','),
                sequences: ([[a, b], [b, a]] as [Move, Move][]).filter(([intrusion]) => winning.has(intrusion)),
            };

            for (const [intrusion] of bridge.sequences) {
                intrusions.set(intrusion, bridge);
            }
        }

        return intrusions;
    };

    /*
     * Tree generation
     */

    /**
     * Generated nodes having children or not, by position, for transpositions.
     */
    const positions = new Map<string, PuzzleNode>();

    /**
     * Main sequence moves to reach each generated node, for warnings.
     */
    const paths = new Map<PuzzleNode, Move[]>([[start, fromPath]]);

    /**
     * Bridges intrusions not played in main sequence, to declare as parallel sequences once tree is generated.
     */
    const parallelCandidates = new Map<PuzzleNode, BridgeIntrusions[]>();

    /**
     * Whether position has already been reached: then node is a transposition leaf.
     */
    const isTransposition = (node: PuzzleNode, moves: Move[]): boolean => {
        const key = getPositionKey(moves);

        if (positions.has(key)) {
            return true;
        }

        positions.set(key, node);

        return false;
    };

    /**
     * Why player has no proven win, from solves with disabled cells filled for each claim.
     */
    const notWinningCode = (winSolve: SolveResult, notWinSolve: SolveResult): PuzzleGenerateWarningCode => {
        if (notWinSolve.winner === opponent) {
            return 'generator_initial_not_winning';
        }

        // Player wins only when disabled cells help: likely missing edge connections
        if (winSolve.winner === opponent && notWinSolve.winner === player) {
            return 'generator_depends_on_disabled_cells';
        }

        return 'generator_unproven';
    };

    const isPlayable = (position: Position, move: unknown): move is Move =>
        typeof move === 'string' && validateMove(move) && emptyCells(position).includes(move);

    /**
     * Computer move proven winning, computer to move, best by katahex policy.
     * Undefined if none is proven, or budget exceeded.
     */
    const findWinningComputerMove = async (position: Position, avoid: Set<Move> = new Set()): Promise<undefined | Move> => {
        const output = await solve(position, 'notWin', true);
        const winningMoves = (Object.entries(output?.children ?? {}) as [Move, SolveResult][])
            .filter(([move, { winner }]) => winner === opponent && !avoid.has(move) && !inheritedCells.has(move))
            .map(([move]) => move)
            .sort();

        if (winningMoves.length === 0) {
            return undefined;
        }

        return (await candidateMoves(position)).find(({ move }) => winningMoves.includes(move))?.move ?? winningMoves[0];
    };

    /**
     * Refutation shown after a failed move: computer, player, computer...
     * Follows solver proof, which can be empty (e.g position solved without search),
     * else finds computer winning moves, and most likely player moves.
     *
     * @param position After failed move, computer to move
     */
    const createRefutation = async (position: Position, pv: string[]): Promise<Move[]> => {
        const moves: Move[] = [];
        let current = position;
        let followPv = true;

        const nextMove = async (byComputer: boolean): Promise<undefined | Move> => {
            const pvMove = followPv ? pv[moves.length] : undefined;

            if (isPlayable(current, pvMove)) {
                return pvMove;
            }

            followPv = false;

            if (byComputer) {
                return await findWinningComputerMove(current);
            }

            return (await candidateMoves(current))[0]?.move ?? emptyCells(current)[0];
        };

        for (let i = 0; i < 2 * refutationLength - 1 && !isOpponentConnected(current); ++i) {
            const move = await nextMove(i % 2 === 0);

            if (move === undefined) {
                break;
            }

            moves.push(move);
            current = play(current, move);
        }

        return moves;
    };

    const toContinuation = (moves: Move[]): undefined | PuzzleNode[] => moves.length === 0
        ? undefined
        : [moves.reduceRight<null | PuzzleNode>(
            (next, move) => next === null ? { move } : { move, children: [next] },
            null,
        )!]
    ;

    /**
     * Player to move.
     *
     * @param avoid Cells of bridges intrusions found on ancestors, to keep them free for parallel sequences
     */
    const generatePlayerChoice = async (node: PuzzleNode, moves: Move[], position: Position, avoid: Set<Move>): Promise<void> => {
        const [winSolve, notWinSolve] = await Promise.all([
            solve(position, 'win', true),
            solve(position, 'notWin', true),
        ]);

        if (winSolve === null || notWinSolve === null) {
            warn('generator_budget_exceeded', moves);
            return;
        }

        const winning = new Map<Move, SolveResult>();
        const losing = new Map<Move, SolveResult>();

        for (const [move, result] of Object.entries(winSolve.children ?? {}) as [Move, SolveResult][]) {
            if (result.winner === player && !inheritedCells.has(move)) {
                winning.set(move, result);
            }
        }

        for (const [move, result] of Object.entries(notWinSolve.children ?? {}) as [Move, SolveResult][]) {
            if (result.winner === opponent && !inheritedCells.has(move)) {
                losing.set(move, result);
            }
        }

        if (winning.size === 0) {
            warn(notWinningCode(winSolve, notWinSolve), moves);
            return;
        }

        const candidates = await candidateMoves(position);
        const policies = new Map(candidates.map(({ move, policy }) => [move, policy]));
        const byPolicy = (a: Move, b: Move): number => (policies.get(b) ?? 0) - (policies.get(a) ?? 0) || a.localeCompare(b);

        // Intrusions in opponent bridges are parallel sequences, unless there is nothing else to play
        const intrusions = findBridgeIntrusions(position, winning);
        const mainWinning = [...winning.keys()].filter(move => !intrusions.has(move));
        const accepted = (mainWinning.length > 0 ? mainWinning : [...winning.keys()]).sort(byPolicy);

        if (mainWinning.length > 0 && intrusions.size > 0) {
            parallelCandidates.set(node, [...new Set(intrusions.values())]);
            avoid = new Set([...avoid, ...[...intrusions.values()].flatMap(({ sequences }) => sequences.flat())]);
        }

        const best = candidates[0]?.policy ?? 0;
        const failures = candidates
            .slice(0, KATAHEX_MAX_PLAUSIBLE_MOVES)
            .filter(({ move, policy }) => policy >= best * KATAHEX_PLAUSIBLE_POLICY_RATIO && losing.has(move) && !avoid.has(move))
            .slice(0, GENERATOR_MAX_PLAUSIBLE_FAILURES)
            .map(({ move }) => move)
        ;

        const children: (PuzzleNode | PuzzleElseNode)[] = [];
        const acceptedNodes: PuzzleNode[] = [];

        for (const move of accepted) {
            if (!reserveNodes(1)) {
                warn('generator_budget_exceeded', moves);
                break;
            }

            const child: PuzzleNode = { move };

            children.push(child);
            acceptedNodes.push(child);
        }

        const refutations = await Promise.all(failures.map(move => createRefutation(play(position, move), losing.get(move)!.pv)));

        for (const [index, move] of failures.entries()) {
            const failureMoves = [...moves, move];
            const samePosition = positions.get(getPositionKey(failureMoves));

            // Already failed from another moves order: continue from there
            if (samePosition !== undefined) {
                if (samePosition.result === 'failed' && reserveNodes(1)) {
                    children.push({ move });
                }

                continue;
            }

            const refutation = toContinuation(refutations[index]);

            if (!reserveNodes(1 + (refutation ? countNodes({ children: refutation }) : 0))) {
                break;
            }

            const failed: PuzzleNode = { move, result: 'failed', ...(refutation ? { children: refutation } : {}) };

            positions.set(getPositionKey(failureMoves), failed);
            children.push(failed);
        }

        // Other moves are answered by the most common refutation
        const covered = new Set<Move>([...accepted, ...failures, ...intrusions.keys()]);
        const answers = new Map<Move, number>();

        for (const [move, { pv }] of losing) {
            if (!covered.has(move) && isPlayable(position, pv[0]) && !avoid.has(pv[0])) {
                answers.set(pv[0], (answers.get(pv[0]) ?? 0) + 1);
            }
        }

        // Without proofs, computer plays the move that would win if player passed
        const elseAnswer = [...answers.entries()].sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))[0]?.[0]
            ?? refutations.find(refutation => refutation.length > 0 && !avoid.has(refutation[0]))?.[0]
            ?? (losing.size > 0 ? await findWinningComputerMove({ ...position, toMove: playerColor === 0 ? 1 : 0 }, avoid) : undefined);

        if (elseAnswer !== undefined && emptyCells(position).some(move => !covered.has(move)) && reserveNodes(1)) {
            children.push({ else: elseAnswer });
        }

        node.children = children;

        await Promise.all(acceptedNodes.map(child => {
            const childMoves = [...moves, child.move!];

            paths.set(child, childMoves);

            return generatePlayerMove(child, childMoves, play(position, child.move!), winning.get(child.move!)!.pv, avoid);
        }));
    };

    /**
     * Player just played a winning move.
     *
     * @param pv Solver proof after player move, its first move is a computer answer
     */
    const generatePlayerMove = async (node: PuzzleNode, moves: Move[], position: Position, pv: string[], avoid: Set<Move>): Promise<void> => {
        if (isPuzzleEnded(position) || isTransposition(node, moves)) {
            return;
        }

        await generateComputerAnswers(node, moves, position, avoid, pv[0] as undefined | Move);
    };

    /**
     * Computer moves worth trying: best by katahex policy, and solver proof move.
     * Without katahex, cells closest to last move.
     */
    const getComputerCandidates = async (position: Position, moves: Move[], avoid: Set<Move>, fallback?: Move): Promise<Move[]> => {
        const empty = emptyCells(position);
        const byPolicy = (await candidateMoves(position)).map(({ move }) => move);
        const lastMove = moves[moves.length - 1];
        let ordered = byPolicy;

        if (ordered.length === 0 && lastMove !== undefined) {
            const { row, col } = parseMove(lastMove);
            const distance = (move: Move): number => {
                const coords = parseMove(move);
                const dr = coords.row - row;
                const dc = coords.col - col;

                return (Math.abs(dr) + Math.abs(dc) + Math.abs(dr + dc)) / 2;
            };

            ordered = [...empty].sort((a, b) => distance(a) - distance(b));
        }

        const candidates = [...new Set([
            ...ordered.filter(move => !avoid.has(move)).slice(0, GENERATOR_COMPUTER_CANDIDATES),
            ...(isPlayable(position, fallback) && !avoid.has(fallback) ? [fallback] : []),
        ])];

        return candidates.length > 0 ? candidates : empty;
    };

    /**
     * Most resisting computer move: all moves lose after a winning player move,
     * so plays the one leaving player the fewest winning answers, proven by solver.
     * Bridges intrusions are not counted, they are parallel sequences.
     * Ties are broken by katahex policy.
     */
    const findHardestComputerMove = async (position: Position, moves: Move[], avoid: Set<Move>, fallback?: Move): Promise<undefined | Move> => {
        const candidates = await getComputerCandidates(position, moves, avoid, fallback);

        if (candidates.length <= 1) {
            return candidates[0];
        }

        const scores = await Promise.all(candidates.map(async move => {
            const childPosition = play(position, move);

            if (isOpponentConnected(childPosition)) {
                return Infinity;
            }

            const output = await solve(childPosition, 'win', true);
            const winning = new Map((Object.entries(output?.children ?? {}) as [Move, SolveResult][])
                .filter(([, { winner }]) => winner === player));

            if (winning.size === 0) {
                // Not proven, or budget exceeded
                return Infinity;
            }

            const intrusions = findBridgeIntrusions(childPosition, winning);
            const answers = [...winning.keys()].filter(answer => !intrusions.has(answer)).length;

            return answers > 0 ? answers : winning.size;
        }));

        const best = Math.min(...scores);

        return candidates[best === Infinity ? 0 : scores.indexOf(best)];
    };

    /**
     * Computer to move, after a player move, or on start node.
     *
     * @param fallback Computer answer when katahex is not available, from solver proof
     */
    const generateComputerAnswers = async (node: PuzzleNode, moves: Move[], position: Position, avoid: Set<Move>, fallback?: Move): Promise<void> => {
        const answer = await findHardestComputerMove(position, moves, avoid, fallback);

        if (answer === undefined) {
            warn('generator_unproven', moves);
            return;
        }

        if (!reserveNodes(1)) {
            warn('generator_budget_exceeded', moves);
            return;
        }

        // Only one answer: author can add a variation, and generate again from it
        const children: PuzzleNode[] = [{ move: answer }];

        node.children = children;

        await Promise.all(children.map(child => {
            const childMoves = [...moves, child.move!];
            const childPosition = play(position, child.move!);

            paths.set(child, childMoves);

            if (isOpponentConnected(childPosition) || isTransposition(child, childMoves)) {
                return Promise.resolve();
            }

            return generatePlayerChoice(child, childMoves, childPosition, avoid);
        }));
    };

    let startPosition: Position = { red: puzzle.redStones, blue: puzzle.blueStones, toMove: getFirstColor(puzzle) };

    for (const move of fromPath) {
        startPosition = play(startPosition, move);
    }

    if (isOpponentConnected(startPosition)) {
        warn('generator_initial_not_winning', fromPath);
        return { subtree: {}, warnings };
    }

    if (isPuzzleEnded(startPosition)) {
        warn('generator_already_connected', fromPath);
        return { subtree: {}, warnings };
    }

    if (fromPath.length > 0) {
        isTransposition(start, fromPath);
    }

    if (startPosition.toMove === playerColor) {
        await generatePlayerChoice(start, fromPath, startPosition, new Set());
    } else {
        // Computer plays first: check it cannot win
        const [output, notWinOutput] = await Promise.all([
            solve(startPosition, 'win', false),
            solve(startPosition, 'notWin', false),
        ]);

        if (output !== null && notWinOutput !== null && output.winner !== player) {
            warn(notWinningCode(output, notWinOutput), fromPath);
        }

        await generateComputerAnswers(start, fromPath, startPosition, new Set(), output?.pv[0] as undefined | Move);
    }

    /*
     * Parallel sequences, declared top-down once main sequence is known, to not overlap its cells
     */

    const declaringNodes = new Map<PuzzleNode, PuzzleNode>();

    /**
     * @param declaredKeys Bridges declared, or dropped and warned, by ancestors
     * @param usedCells Cells of parallel sequences declared by ancestors
     */
    const declareParallels = (node: PuzzleNode, declaredKeys: Set<string>, usedCells: Set<Move>): void => {
        const candidates = parallelCandidates.get(node) ?? [];

        if (candidates.length > 0 && (node.children?.length ?? 0) > 0) {
            const mainCells = collectCells({ children: node.children }) as Set<Move>;
            const roots: PuzzleNode[] = [];

            for (const { key, sequences } of candidates) {
                if (declaredKeys.has(key)) {
                    continue;
                }

                const cells = sequences.flat();

                declaredKeys = new Set([...declaredKeys, key]);

                if (cells.some(cell => mainCells.has(cell) || usedCells.has(cell)) || !reserveNodes(1 + 2 * sequences.length)) {
                    warn('generator_parallel_dropped', paths.get(node)!, { move: sequences[0][0] });
                    continue;
                }

                const root: PuzzleNode = { children: sequences.map(([intrusion, answer]) => ({ move: intrusion, children: [{ move: answer }] })) };

                roots.push(root);
                declaringNodes.set(root, node);
                usedCells = new Set([...usedCells, ...cells]);
            }

            if (roots.length > 0) {
                node.parallel = roots;
            }
        }

        for (const child of node.children ?? []) {
            // No parallel sequences in continuations
            if (!isElseNode(child) && child.result === undefined) {
                declareParallels(child, declaredKeys, usedCells);
            }
        }
    };

    declareParallels(start, new Set(), new Set(inheritedCells));

    // A transposition must continue with same parallel sequences: drop the different ones
    for (let changed = true; changed;) {
        changed = false;

        const findParallels = createParallelsFinder(tree);

        for (const [leaf, { target }] of findTranspositions(tree)) {
            const leafParallels = findParallels(leaf);
            const targetParallels = findParallels(target);
            const different = [
                ...leafParallels.filter(root => !targetParallels.includes(root)),
                ...targetParallels.filter(root => !leafParallels.includes(root)),
            ];

            for (const root of different) {
                const declaring = declaringNodes.get(root);

                if (declaring === undefined) {
                    continue;
                }

                declaring.parallel = declaring.parallel?.filter(other => other !== root);

                if (declaring.parallel?.length === 0) {
                    delete declaring.parallel;
                }

                declaringNodes.delete(root);
                warn('generator_parallel_dropped', paths.get(declaring)!, { move: (root.children![0] as PuzzleNode).move! });
                changed = true;
            }
        }
    }

    // Report errors of generated tree, not the ones already there
    const previousErrors = new Set(validatePuzzle(puzzle).map(puzzleErrorToString));

    for (const error of validatePuzzle({ ...puzzle, tree })) {
        if (!previousErrors.has(puzzleErrorToString(error))) {
            warnings.push({ ...error, code: 'generator_invalid_tree', params: { ...error.params, error: error.code } });
        }
    }

    return {
        subtree: {
            ...(start.children ? { children: start.children } : {}),
            ...(start.parallel ? { parallel: start.parallel } : {}),
        },
        warnings,
    };
};
