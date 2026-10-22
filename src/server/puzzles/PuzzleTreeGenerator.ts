import { coordsToMove, parseMove, validateMove, type Move } from '@playhex/move-notation';
import type { SolvePositionOutput, SolveResult } from '../ai-jobs/protocol.js';
import { solveCacheKey } from '../ai-jobs/PositionSolveCache.js';
import { analysisCacheKey, type AnalysisInput, type AnalysisOutput } from '../../shared/app/hexplorer.js';
import { collectCells, createParallelsFinder, findElseNode, findTranspositions, getFirstColor, getParallelKey, getPositionKey, isElseNode, puzzleErrorToString, PUZZLE_MAX_NODES, validatePuzzle, type PuzzleElseNode, type PuzzleNode } from '../../shared/app/puzzles/puzzleTree.js';
import { KATAHEX_MAX_PLAUSIBLE_MOVES, KATAHEX_PLAUSIBLE_POLICY_RATIO, SOLVER_CHILDREN_MAX_TIME_SECONDS } from '../../shared/app/puzzles/puzzleCheck.js';
import { createPuzzleEndChecker, findGenerateStartNode, GENERATOR_MAX_PLAUSIBLE_FAILURES, GENERATOR_MAX_SOLVES, type PuzzleGenerateInput, type PuzzleGenerateOutput, type PuzzleGenerateWarning, type PuzzleGenerateWarningCode } from '../../shared/app/puzzles/puzzleGenerate.js';
import { findTemplateInstances } from '../../shared/hex-templates/template-connection.js';
import { fillForKatahex, getEdgePaths, type EdgePaths } from '../../shared/app/puzzles/edgeConnections.js';
import { createLimiter, getPolicyCandidates, getSolveEdgePaths, play, toColor, toSolveInput, type Position, type SolveClaim } from './puzzleCheckUtils.js';
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

/**
 * Bridges intrusions found on a node, player to move, to declare as parallel sequences,
 * or else as main moves, see generateIntrusions().
 */
type ParallelCandidates = {
    position: Position;
    winning: Map<Move, SolveResult>;

    /**
     * Cells avoided by ancestors, without the ones of these bridges.
     */
    avoid: Set<Move>;

    /**
     * Cells of parallel sequences already in tree, see generatePlayerChoice().
     */
    blocked: Set<Move>;

    bridges: BridgeIntrusions[];
};

const countNodes = (node: PuzzleNode): number => [...node.children ?? [], ...node.parallel ?? []]
    .reduce((count, child) => count + 1 + (isElseNode(child) ? 0 : countNodes(child)), 0);

/**
 * Completes tree from a node, with Mohex solver, see PuzzleGenerateInput.
 * Existing nodes are kept: missing moves are added, and existing moves contradicting solver are warned.
 * From a leaf, generates whole subtree.
 *
 * - player choice: proven winning moves are accepted, plausible (katahex policy) proven losing moves fail
 *   and are followed by a refutation from solver, other moves are answered by an "else" node.
 *   Winning intrusions in an opponent bridge are parallel sequences instead of main moves,
 *   unless main sequence uses their cells.
 * - computer answer: best katahex policy move.
 *
 * Puzzle ends once player is connected with acquired templates, see findTemplateConnection().
 * Nodes that could not be generated (not proven, budget exceeded) are left without children, and warned.
 *
 * @throws {Error} If fromPath does not reach a node to generate from
 * @throws Errors from solve and analyze
 */
export const generatePuzzleTree = async (input: PuzzleGenerateInput, options: PuzzleTreeGeneratorOptions): Promise<PuzzleGenerateOutput> => {
    const { puzzle, fromPath, templateIds } = input;
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

    /**
     * Adds cells of parallel sequences declared on this node.
     * Called before generating, so only existing ones are there.
     */
    const withParallelCells = (blocked: Set<Move>, node: PuzzleNode): Set<Move> => node.parallel?.length
        ? new Set([...blocked, ...collectCells({ parallel: node.parallel }) as Set<Move>])
        : blocked
    ;

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

    /**
     * Edge paths by position, computed once for both claims, see getSolveEdgePaths().
     */
    const edgePathsCache = new Map<string, EdgePaths>();

    const solve = (position: Position, claim: SolveClaim, children: boolean): null | Promise<SolvePositionOutput> => {
        const input = { size: boardsize, color: toColor(position.toMove), black: position.red, white: position.blue, disabledCells, edgeConnections: puzzle.edgeConnections, fixedFill: puzzle.fixedFill };
        const pathsKey = position.red.join(' ') + '|' + position.blue.join(' ');
        let edgePaths = edgePathsCache.get(pathsKey);

        if (edgePaths === undefined) {
            edgePaths = getSolveEdgePaths(input);
            edgePathsCache.set(pathsKey, edgePaths);
        }

        const solveInput = toSolveInput(input, player, claim, edgePaths, children ? SOLVER_CHILDREN_MAX_TIME_SECONDS : undefined);

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
    const katahexEdgePaths = getEdgePaths({ boardsize, redStones: puzzle.redStones, blueStones: puzzle.blueStones, disabledCells, fixedFill: puzzle.fixedFill }, puzzle.edgeConnections);

    /**
     * Moves katahex would play, best first. Empty without katahex.
     */
    const candidateMoves = async (position: Position, blocked: Set<Move>): Promise<{ move: Move, policy: number }[]> => {
        const { analyze } = options;

        if (analyze === null) {
            return [];
        }

        const analysisInput = {
            size: boardsize,
            color: toColor(position.toMove),
            ...fillForKatahex(position.red, position.blue, disabledCells, player, katahexEdgePaths, puzzle.fixedFill),
        };
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

        return getPolicyCandidates(policy, boardsize, new Set([...position.red, ...position.blue]), new Set([...disabledCells, ...blocked]));
    };

    /*
     * Position helpers
     */

    const opponentColor = playerColor === 0 ? 1 : 0;
    const { templateStones, templateDisabledCells, isOpponentConnected, isPuzzleEnded } = createPuzzleEndChecker(puzzle, templateIds);

    const emptyCells = (position: Position, blocked: Set<Move>): Move[] => {
        const unavailable = new Set<Move>([...position.red, ...position.blue, ...disabledCells, ...blocked]);
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
            own: templateStones(position, opponentColor),
            opponent: templateStones(position, playerColor),
            disabledCells: templateDisabledCells,
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
     * Also nodes of the rest of tree having children or a result, generated nodes reaching them are transpositions.
     */
    const positions = new Map<string, PuzzleNode>();

    const addTreePositions = (node: PuzzleNode, moves: Move[]): void => {
        // Positions in continuations are not transpositions
        if (node.result !== undefined) {
            return;
        }

        for (const child of node.children ?? []) {
            if (isElseNode(child) || child.move === undefined) {
                continue;
            }

            const childMoves = [...moves, child.move];
            const key = getPositionKey(childMoves);

            if (!positions.has(key) && (child.result !== undefined || (child.children?.length ?? 0) > 0)) {
                positions.set(key, child);
            }

            addTreePositions(child, childMoves);
        }
    };

    addTreePositions(tree, []);

    /**
     * Main sequence moves to reach each generated node, for warnings.
     */
    const paths = new Map<PuzzleNode, Move[]>([[start, fromPath]]);

    /**
     * Bridges intrusions not played in main sequence, to declare as parallel sequences once tree is generated.
     */
    const parallelCandidates = new Map<PuzzleNode, ParallelCandidates>();

    /**
     * Whether position has already been reached by another node: then node is a transposition leaf.
     */
    const isTransposition = (node: PuzzleNode, moves: Move[]): boolean => {
        const key = getPositionKey(moves);

        if (positions.has(key)) {
            return positions.get(key) !== node;
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

    const isPlayable = (position: Position, move: unknown, blocked: Set<Move>): move is Move =>
        typeof move === 'string' && validateMove(move) && emptyCells(position, blocked).includes(move);

    /**
     * Computer move proven winning, computer to move, best by katahex policy.
     * Undefined if none is proven, or budget exceeded.
     */
    const findWinningComputerMove = async (position: Position, blocked: Set<Move>, avoid: Set<Move> = new Set()): Promise<undefined | Move> => {
        const output = await solve(position, 'notWin', true);
        const winningMoves = (Object.entries(output?.children ?? {}) as [Move, SolveResult][])
            .filter(([move, { winner }]) => winner === opponent && !avoid.has(move) && !blocked.has(move))
            .map(([move]) => move)
            .sort();

        if (winningMoves.length === 0) {
            return undefined;
        }

        return (await candidateMoves(position, blocked)).find(({ move }) => winningMoves.includes(move))?.move ?? winningMoves[0];
    };

    /**
     * Computer answer shown after a failed move.
     * Follows solver proof, which can be empty (e.g position solved without search),
     * else finds a computer winning move.
     *
     * @param position After failed move, computer to move
     */
    const createRefutation = async (position: Position, pv: string[], blocked: Set<Move>): Promise<undefined | Move> => {
        if (isOpponentConnected(position)) {
            return undefined;
        }

        return isPlayable(position, pv[0], blocked)
            ? pv[0]
            : await findWinningComputerMove(position, blocked);
    };

    /**
     * Player to move. Existing children are kept, and checked with solver:
     * missing winning moves, plausible failures with their refutation, and "else" node are added,
     * then accepted moves are continued.
     *
     * @param avoid Cells of bridges intrusions found on ancestors, to keep them free for parallel sequences
     * @param blocked Cells of parallel sequences already in tree, declared on ancestors: not played
     */
    const generatePlayerChoice = async (node: PuzzleNode, moves: Move[], position: Position, avoid: Set<Move>, blocked: Set<Move>): Promise<void> => {
        blocked = withParallelCells(blocked, node);

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
            if (result.winner === player && !blocked.has(move)) {
                winning.set(move, result);
            }
        }

        for (const [move, result] of Object.entries(notWinSolve.children ?? {}) as [Move, SolveResult][]) {
            if (result.winner === opponent && !blocked.has(move)) {
                losing.set(move, result);
            }
        }

        if (winning.size === 0) {
            warn(notWinningCode(winSolve, notWinSolve), moves);
            return;
        }

        const existing = (node.children ?? []).filter(child => !isElseNode(child)) as PuzzleNode[];
        const existingElse = findElseNode(node);
        const existingMoves = new Set(existing.map(child => child.move!));

        for (const child of existing) {
            if (child.result === 'failed' && winning.has(child.move!)) {
                warn('generator_failed_winning', [...moves, child.move!]);
            } else if (child.result !== 'failed' && losing.has(child.move!)) {
                warn('generator_accepted_losing', [...moves, child.move!]);
            }
        }

        const candidates = await candidateMoves(position, blocked);
        const policies = new Map(candidates.map(({ move, policy }) => [move, policy]));
        const byPolicy = (a: Move, b: Move): number => (policies.get(b) ?? 0) - (policies.get(a) ?? 0) || a.localeCompare(b);

        // Intrusions in opponent bridges are parallel sequences, unless there is nothing else to play
        const intrusions = findBridgeIntrusions(position, winning);
        const mainWinning = [...winning.keys()].filter(move => !intrusions.has(move));
        const accepted = (mainWinning.length > 0 ? mainWinning : [...winning.keys()])
            .filter(move => !existingMoves.has(move))
            .sort(byPolicy);
        const best = candidates[0]?.policy ?? 0;


        if (mainWinning.length > 0 && intrusions.size > 0) {
            parallelCandidates.set(node, { position, winning, avoid, blocked, bridges: [...new Set(intrusions.values())] });
            avoid = new Set([...avoid, ...[...intrusions.values()].flatMap(({ sequences }) => sequences.flat())]);
        }

        const existingFailures = existing.filter(child => child.result === 'failed').length;
        const failures = candidates
            .slice(0, KATAHEX_MAX_PLAUSIBLE_MOVES)
            .filter(({ move, policy }) => policy >= best * KATAHEX_PLAUSIBLE_POLICY_RATIO && losing.has(move) && !avoid.has(move) && !existingMoves.has(move))
            .slice(0, Math.max(0, GENERATOR_MAX_PLAUSIBLE_FAILURES - existingFailures))
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

        const refutations = await Promise.all(failures.map(move => createRefutation(play(position, move), losing.get(move)!.pv, blocked)));

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

            const refutation = refutations[index];

            if (!reserveNodes(refutation === undefined ? 1 : 2)) {
                break;
            }

            const failed: PuzzleNode = { move, result: 'failed', ...(refutation === undefined ? {} : { children: [{ move: refutation }] }) };

            positions.set(getPositionKey(failureMoves), failed);
            children.push(failed);
        }

        // Existing failed moves without refutation
        await Promise.all(existing
            .filter(child => child.result === 'failed' && !child.children?.length && losing.has(child.move!))
            .map(async child => {
                const refutation = await createRefutation(play(position, child.move!), losing.get(child.move!)!.pv, blocked);

                if (refutation !== undefined && reserveNodes(1)) {
                    child.children = [{ move: refutation }];
                }
            }),
        );

        let elseNode = existingElse;

        if (elseNode === null) {
            // Other moves are answered by the most common refutation
            const covered = new Set<Move>([...existingMoves, ...accepted, ...failures, ...intrusions.keys()]);
            const answers = new Map<Move, number>();

            for (const [move, { pv }] of losing) {
                if (!covered.has(move) && isPlayable(position, pv[0], blocked) && !avoid.has(pv[0])) {
                    answers.set(pv[0], (answers.get(pv[0]) ?? 0) + 1);
                }
            }

            // Without proofs, computer plays the move that would win if player passed
            const elseAnswer = [...answers.entries()].sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))[0]?.[0]
                ?? refutations.find(refutation => refutation !== undefined && !avoid.has(refutation))
                ?? (losing.size > 0 ? await findWinningComputerMove({ ...position, toMove: playerColor === 0 ? 1 : 0 }, blocked, avoid) : undefined);

            if (elseAnswer !== undefined && emptyCells(position, blocked).some(move => !covered.has(move)) && reserveNodes(1)) {
                elseNode = { else: elseAnswer };
            }
        }

        node.children = [...existing, ...children, ...elseNode === null ? [] : [elseNode]];

        // Existing accepted moves are continued only if winning, else warned above
        const toContinue = [...existing, ...acceptedNodes].filter(child => child.result === undefined
            && winning.has(child.move!),
        );

        await Promise.all(toContinue.map(child => {
            const childMoves = [...moves, child.move!];

            paths.set(child, childMoves);

            return generatePlayerMove(child, childMoves, play(position, child.move!), winning.get(child.move!)!.pv, avoid, blocked);
        }));
    };

    /**
     * Player just played a winning move.
     *
     * @param pv Solver proof after player move, its first move is a computer answer
     */
    const generatePlayerMove = async (node: PuzzleNode, moves: Move[], position: Position, pv: string[], avoid: Set<Move>, blocked: Set<Move>): Promise<void> => {
        if (isPuzzleEnded(position) || isTransposition(node, moves)) {
            return;
        }

        await generateComputerAnswers(node, moves, position, avoid, blocked, pv[0] as undefined | Move);
    };

    /**
     * Computer move after a winning player move: all moves lose, so plays the most natural one,
     * best by katahex policy.
     * Without katahex, solver proof move, else cell closest to last move.
     */
    const findComputerMove = async (position: Position, moves: Move[], avoid: Set<Move>, blocked: Set<Move>, fallback?: Move): Promise<undefined | Move> => {
        const best = (await candidateMoves(position, blocked)).find(({ move }) => !avoid.has(move));

        if (best !== undefined) {
            return best.move;
        }

        if (isPlayable(position, fallback, blocked) && !avoid.has(fallback)) {
            return fallback;
        }

        const empty = emptyCells(position, blocked);
        const free = empty.filter(move => !avoid.has(move));
        const lastMove = moves[moves.length - 1];

        if (free.length === 0 || lastMove === undefined) {
            return free[0] ?? empty[0];
        }

        const { row, col } = parseMove(lastMove);
        const distance = (move: Move): number => {
            const coords = parseMove(move);
            const dr = coords.row - row;
            const dc = coords.col - col;

            return (Math.abs(dr) + Math.abs(dc) + Math.abs(dr + dc)) / 2;
        };

        return free.reduce((closest, move) => distance(move) < distance(closest) ? move : closest);
    };

    /**
     * Computer to move, after a player move, or on start node.
     * Existing answers are continued, else best one is added.
     *
     * @param fallback Computer answer when katahex is not available, from solver proof
     */
    const generateComputerAnswers = async (node: PuzzleNode, moves: Move[], position: Position, avoid: Set<Move>, blocked: Set<Move>, fallback?: Move): Promise<void> => {
        blocked = withParallelCells(blocked, node);

        let children = (node.children ?? []).filter(child => !isElseNode(child) && child.result === undefined) as PuzzleNode[];

        if (children.length === 0 && !node.children?.length) {
            const answer = await findComputerMove(position, moves, avoid, blocked, fallback);

            if (answer === undefined) {
                warn('generator_unproven', moves);
                return;
            }

            if (!reserveNodes(1)) {
                warn('generator_budget_exceeded', moves);
                return;
            }

            // Only one answer: author can add a variation, and generate again from it
            children = [{ move: answer }];
            node.children = children;
        }

        await Promise.all(children.map(child => {
            const childMoves = [...moves, child.move!];
            const childPosition = play(position, child.move!);

            paths.set(child, childMoves);

            if (isOpponentConnected(childPosition) || isTransposition(child, childMoves)) {
                return Promise.resolve();
            }

            return generatePlayerChoice(child, childMoves, childPosition, avoid, blocked);
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
        await generatePlayerChoice(start, fromPath, startPosition, new Set(), inheritedCells);
    } else {
        // Computer plays first: check it cannot win
        const [output, notWinOutput] = await Promise.all([
            solve(startPosition, 'win', false),
            solve(startPosition, 'notWin', false),
        ]);

        if (output !== null && notWinOutput !== null && output.winner !== player) {
            warn(notWinningCode(output, notWinOutput), fromPath);
        }

        await generateComputerAnswers(start, fromPath, startPosition, new Set(), inheritedCells, output?.pv[0] as undefined | Move);
    }

    /*
     * Parallel sequences, declared top-down once main sequence is known, to not overlap its cells
     */

    /**
     * Node declaring each parallel sequence root, and its bridge.
     */
    const declaringNodes = new Map<PuzzleNode, { node: PuzzleNode, bridge: BridgeIntrusions }>();

    /**
     * Bridges that cannot be parallel sequences, to play as main moves instead, by declaring node.
     */
    let dropped = new Map<PuzzleNode, BridgeIntrusions[]>();

    const drop = (node: PuzzleNode, bridge: BridgeIntrusions): void => {
        dropped.set(node, [...dropped.get(node) ?? [], bridge]);
    };

    /**
     * @param declaredKeys Bridges declared, or dropped, by ancestors
     * @param usedCells Cells of parallel sequences declared by ancestors
     */
    const declareParallels = (node: PuzzleNode, declaredKeys: Set<string>, usedCells: Set<Move>): void => {
        const candidates = parallelCandidates.get(node);

        usedCells = withParallelCells(usedCells, node);

        if (candidates !== undefined && (node.children?.length ?? 0) > 0) {
            const mainCells = collectCells({ children: node.children }) as Set<Move>;
            const roots: PuzzleNode[] = [];

            for (const bridge of candidates.bridges) {
                const { key, sequences } = bridge;

                if (declaredKeys.has(key)) {
                    continue;
                }

                const cells = sequences.flat();

                declaredKeys = new Set([...declaredKeys, key]);

                if (cells.some(cell => mainCells.has(cell) || usedCells.has(cell))) {
                    drop(node, bridge);
                    continue;
                }

                if (!reserveNodes(1 + 2 * sequences.length)) {
                    // Not retried in next declarations
                    candidates.bridges = candidates.bridges.filter(other => other !== bridge);
                    warn('generator_parallel_dropped', paths.get(node)!, { move: sequences[0][0] });
                    continue;
                }

                const root: PuzzleNode = { children: sequences.map(([intrusion, answer]) => ({ move: intrusion, children: [{ move: answer }] })) };

                roots.push(root);
                declaringNodes.set(root, { node, bridge });
                usedCells = new Set([...usedCells, ...cells]);
            }

            if (roots.length > 0) {
                node.parallel = [...node.parallel ?? [], ...roots];
            }
        }

        for (const child of node.children ?? []) {
            // No parallel sequences in continuations
            if (!isElseNode(child) && child.result === undefined) {
                declareParallels(child, declaredKeys, usedCells);
            }
        }
    };

    /**
     * A transposition must continue with same parallel sequences: drop the different ones
     */
    const dropTranspositionsParallels = (): void => {
        for (let changed = true; changed;) {
            changed = false;

            const findParallels = createParallelsFinder(tree);

            for (const [leaf, { target }] of findTranspositions(tree)) {
                // Same sequences declared on both moves orders are the same for player
                const leafParallels = findParallels(leaf);
                const targetParallels = findParallels(target);
                const leafKeys = new Set(leafParallels.map(getParallelKey));
                const targetKeys = new Set(targetParallels.map(getParallelKey));
                const different = [
                    ...leafParallels.filter(root => !targetKeys.has(getParallelKey(root))),
                    ...targetParallels.filter(root => !leafKeys.has(getParallelKey(root))),
                ];

                for (const root of different) {
                    const declaring = declaringNodes.get(root);

                    if (declaring === undefined) {
                        continue;
                    }

                    const { node } = declaring;

                    node.parallel = node.parallel?.filter(other => other !== root);

                    if (node.parallel?.length === 0) {
                        delete node.parallel;
                    }

                    remainingNodes += countNodes({ parallel: [root] });
                    declaringNodes.delete(root);
                    drop(node, declaring.bridge);
                    changed = true;
                }
            }
        }
    };

    /**
     * Removes all declared parallel sequences, to declare them again once main sequence changed.
     * Existing ones are kept.
     */
    const clearParallels = (): void => {
        for (const [root, { node }] of declaringNodes) {
            remainingNodes += countNodes({ parallel: [root] });
            node.parallel = node.parallel?.filter(other => other !== root);

            if (node.parallel?.length === 0) {
                delete node.parallel;
            }
        }

        declaringNodes.clear();
    };

    /**
     * Plays dropped bridges intrusions as main moves, else they would fail while winning.
     */
    const generateIntrusions = async (node: PuzzleNode, bridges: BridgeIntrusions[]): Promise<void> => {
        const candidates = parallelCandidates.get(node)!;
        const moves = paths.get(node)!;

        candidates.bridges = candidates.bridges.filter(bridge => !bridges.includes(bridge));

        // Other carrier cell is now a possible answer
        const avoid = new Set([...candidates.avoid, ...candidates.bridges.flatMap(({ sequences }) => sequences.flat())]);
        const children = node.children ?? [];
        const elseIndex = children.findIndex(isElseNode);
        const intrusionNodes: PuzzleNode[] = [];

        // A cell can be in carriers of two bridges
        const played = new Set(children.map(child => isElseNode(child) ? null : child.move));
        const intrusions = new Set(bridges.flatMap(({ sequences }) => sequences.map(([intrusion]) => intrusion)));

        for (const intrusion of [...intrusions].filter(move => !played.has(move))) {
            if (!reserveNodes(1)) {
                warn('generator_parallel_dropped', moves, { move: intrusion });
                continue;
            }

            intrusionNodes.push({ move: intrusion });
        }

        children.splice(elseIndex === -1 ? children.length : elseIndex, 0, ...intrusionNodes);
        node.children = children;

        await Promise.all(intrusionNodes.map(child => {
            const childMoves = [...moves, child.move!];

            paths.set(child, childMoves);

            return generatePlayerMove(child, childMoves, play(candidates.position, child.move!), candidates.winning.get(child.move!)!.pv, avoid, candidates.blocked);
        }));
    };

    // Declared again each time dropped intrusions are added to main sequence, as they change its cells
    for (;;) {
        declareParallels(start, new Set(), new Set(inheritedCells));
        dropTranspositionsParallels();

        if (dropped.size === 0) {
            break;
        }

        const toGenerate = dropped;

        dropped = new Map();
        clearParallels();

        await Promise.all([...toGenerate].map(([node, bridges]) => generateIntrusions(node, bridges)));
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
