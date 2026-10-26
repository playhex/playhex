import { CircleMark, GameMarksFacade, GameView } from '@playhex/pixi-board';
import type { Move } from '@playhex/move-notation';
import { computed, onUnmounted, ref, shallowRef } from 'vue';
import { Puzzle } from '../../../../shared/app/models/index.js';
import { createNodeResolver, createParallelsFinder, findChild, findElseNode, findSolution, getComputerAnswer, getComputerAnswers, getFirstColor, getNodeResult, getParallelNodeResult, isElseNode, type PuzzleElseNode, type PuzzleNode, type PuzzleResult } from '../../../../shared/app/puzzles/puzzleTree.js';
import { PlayerSettingsFacade } from '../../../services/board-view-facades/PlayerSettingsFacade.js';
import { createPuzzleCellsMask, drawPuzzlePosition, type ColoredMove } from '../services/puzzleBoard.js';

export type PuzzleStatus =
    'player_turn'
    | 'computer_turn'

    /**
     * Current line solved, but computer still has alternative answers to play.
     */
    | 'line_solved'
    | 'solved'
    | 'failed'
;

/**
 * A move played on board since initial position.
 */
type TreeMove =
    | {
        /**
         * Tree node reached by this move.
         * An "else" node is set on both player move and computer answer.
         * Null if move is not in tree: wrong move, or any move played after the end.
         */
        node: null | PuzzleNode | PuzzleElseNode;

        /**
         * Root of the parallel sequence this move is in, or null if in main sequence.
         */
        parallel: null;
    }
    | {
        node: PuzzleNode;
        parallel: PuzzleNode;
    }
;

type PlayedMove = ColoredMove & TreeMove & {
    /**
     * Played by computer, so undone with the player move before it.
     */
    byComputer: boolean;
};

/**
 * Computer alternative answer, played once current line is solved.
 */
type PendingAlternative = {
    /**
     * Moves played before the alternative answer, up to the player move it answers.
     */
    prefix: PlayedMove[];

    answer: PuzzleNode;
};

/**
 * Delay before computer answers, to let player see his move first.
 */
const COMPUTER_ANSWER_DELAY_MS = 200;

const HINT_MARK_GROUP = 'hint';

/**
 * Bootstrap success color
 */
const HINT_MARK_COLOR = 0x198754;

/**
 * Play a puzzle: player plays on board, computer answers following puzzle tree.
 * Once ended, player can keep playing: computer answers if tree has an answer,
 * else player plays both colors.
 * Once a line is solved, computer alternative answers are played, from the top of the line,
 * and player must also solve them.
 */
export const usePuzzle = (puzzle: Puzzle) => {
    const playerColor = puzzle.playerColor;
    const computerColor: 0 | 1 = playerColor === 0 ? 1 : 0;
    const computerPlaysFirst = puzzle.computerPlaysFirst ?? false;
    const firstColor = getFirstColor(puzzle);

    /*
     * GameView must not be a vue ref, see GameView.ts.
     * The shallowRef is only exposed for template.
     */
    const gameView = new GameView(puzzle.boardsize, { cellsMask: createPuzzleCellsMask(puzzle) });
    const gameViewRef = shallowRef(gameView);
    const gameMarksFacade = new GameMarksFacade(gameView);

    const playerSettingsFacade = new PlayerSettingsFacade(gameView);

    /**
     * Tree node to continue from, following transpositions.
     */
    const resolve = createNodeResolver(puzzle.tree);

    const findParallels = createParallelsFinder(puzzle.tree);

    const path = ref<PlayedMove[]>([]);

    const computerThinking = ref(false);

    /**
     * Alternative answers to play once current line is solved, first one next.
     */
    const pendingAlternatives = ref<PendingAlternative[]>([]);

    /**
     * Computer answers already played or queued, to queue each alternative once.
     */
    let discoveredAnswers = new Set<PuzzleNode>();

    /**
     * Alternatives state before current line was solved,
     * restored when line is undone, as player may solve another line with other alternatives.
     */
    let beforeLineSolved: null | { pending: PendingAlternative[], discovered: Set<PuzzleNode> } = null;

    /**
     * Moves before this index cannot be undone: computer first move, or alternative answer being solved.
     */
    const initialLineStartIndex = computerPlaysFirst ? 1 : 0;
    const lineStartIndex = ref(initialLineStartIndex);

    /**
     * Alternative answer being solved, null for main line.
     */
    const currentAlternative = ref<null | PuzzleNode>(null);

    /**
     * Number of the line being solved: 1 for main line, then incremented on each alternative.
     */
    const lineNumber = ref(1);

    /**
     * Computer answer about to be played.
     */
    let pendingMoveTimeout: null | ReturnType<typeof setTimeout> = null;

    type TreeState = {
        /**
         * Result of the first ending node.
         */
        result: null | PuzzleResult;

        /**
         * Node of the move that ended the puzzle,
         * null if not ended or ended by leaving the tree.
         */
        resultNode: PlayedMove['node'];

        /**
         * Current main sequence node, null if moves left the tree.
         */
        node: null | PuzzleNode;

        /**
         * Current node of started parallel sequences, by parallel sequence root.
         */
        parallels: Map<PuzzleNode, PuzzleNode>;
    };

    /**
     * Follows played moves in tree.
     */
    const replay = (playedMoves: PlayedMove[]): TreeState => {
        let result: null | PuzzleResult = null;
        let resultNode: PlayedMove['node'] = null;
        let node: null | PuzzleNode = puzzle.tree;
        const parallels = new Map<PuzzleNode, PuzzleNode>();

        for (const playedMove of playedMoves) {
            if (playedMove.parallel !== null) {
                parallels.set(playedMove.parallel, playedMove.node);

                if (result === null && (result = getParallelNodeResult(playedMove.node)) !== null) {
                    resultNode = playedMove.node;
                }

                continue;
            }

            if (playedMove.node === null || isElseNode(playedMove.node)) {
                if (result === null) {
                    result = 'failed';
                    resultNode = playedMove.node;
                }

                node = null;
                continue;
            }

            node = resolve(playedMove.node);

            if (result === null && (result = getNodeResult(node)) !== null) {
                resultNode = playedMove.node;
            }
        }

        return { result, resultNode, node, parallels };
    };

    const treeState = computed(() => replay(path.value));

    const nextColor = computed<0 | 1>(() => path.value.length % 2 === 0 ? firstColor : (firstColor === 0 ? 1 : 0));

    const status = computed<PuzzleStatus>(() => {
        if (treeState.value.result === 'solved' && pendingAlternatives.value.length > 0) {
            return 'line_solved';
        }

        if (treeState.value.result !== null) {
            return treeState.value.result;
        }

        return computerThinking.value ? 'computer_turn' : 'player_turn';
    });

    /**
     * Puzzle is solved or failed, player can keep playing for both colors.
     */
    const ended = computed(() => treeState.value.result !== null);

    /**
     * Message of a reached node.
     * Transposition shows target message, unless it has its own.
     */
    const getNodeMessage = (node: PlayedMove['node']): undefined | null | string =>
        node === null || isElseNode(node) ? node?.message : node.message || resolve(node).message;

    /**
     * Message of the node that ended the puzzle, to show with the result instead of "solved" / "failed".
     */
    const resultMessage = computed<null | string>(() => getNodeMessage(treeState.value.resultNode) || null);

    /**
     * Messages of nodes reached by last player move and computer answer,
     * or root message at start.
     * Without ending node message, already shown in resultMessage.
     */
    const messages = computed<string[]>(() => {
        // Root message stays until player plays, also when computer plays first
        const rootMessages = puzzle.tree.message && path.value.every(({ byComputer }) => byComputer)
            ? [puzzle.tree.message]
            : []
        ;

        if (path.value.length === 0) {
            return rootMessages;
        }

        let lastPlayerMoveIndex = path.value.length - 1;

        while (lastPlayerMoveIndex > 0 && path.value[lastPlayerMoveIndex].byComputer) {
            --lastPlayerMoveIndex;
        }

        // Set to show "else" node message once, it is on both player move and computer answer
        return [...rootMessages, ...[...new Set(path.value.slice(lastPlayerMoveIndex).map(({ node }) => node))]
            .filter(node => node !== treeState.value.resultNode)
            .map(getNodeMessage)
            .filter((message): message is string => !!message),
        ];
    });

    /**
     * Computer alternative move to ask player about:
     * next one once line is solved, or the one just played until player answers it.
     */
    const alternativeMove = computed<null | Move>(() => {
        if (status.value === 'line_solved') {
            return pendingAlternatives.value[0].answer.move!;
        }

        if (currentAlternative.value !== null && path.value.length <= lineStartIndex.value) {
            return currentAlternative.value.move!;
        }

        return null;
    });

    /**
     * Redraw whole board from initial stones and played moves.
     * Also removes hint mark.
     */
    const redraw = (): void => {
        gameView.removeEntitiesGroup(HINT_MARK_GROUP);
        drawPuzzlePosition(gameView, puzzle, path.value);

        const lastMove = path.value[path.value.length - 1]?.move ?? puzzle.lastMove;

        if (lastMove === null) {
            gameMarksFacade.hideMarks();
        } else {
            gameMarksFacade.markLastMove(lastMove);
        }
    };

    /**
     * Once a line is solved, queues computer alternative answers met along it,
     * from the top of the line.
     */
    const queueAlternatives = (): void => {
        const { result, resultNode } = treeState.value;

        if (result !== 'solved') {
            return;
        }

        beforeLineSolved ??= { pending: [...pendingAlternatives.value], discovered: new Set(discoveredAnswers) };

        let node: PuzzleNode = puzzle.tree;

        for (const [index, playedMove] of path.value.entries()) {
            if (playedMove.parallel !== null || playedMove.node === null || isElseNode(playedMove.node)) {
                continue;
            }

            if (playedMove.byComputer) {
                for (const answer of getComputerAnswers(resolve(node))) {
                    if (!discoveredAnswers.has(answer) && answer !== playedMove.node) {
                        pendingAlternatives.value.push({ prefix: path.value.slice(0, index), answer });
                    }

                    discoveredAnswers.add(answer);
                }
            }

            if (playedMove.node === resultNode) {
                break;
            }

            node = playedMove.node;
        }
    };

    const pushMove = (playedMove: PlayedMove): void => {
        path.value.push(playedMove);
        queueAlternatives();
        redraw();
    };

    const cancelPendingMove = (): void => {
        if (pendingMoveTimeout !== null) {
            clearTimeout(pendingMoveTimeout);
            pendingMoveTimeout = null;
        }

        computerThinking.value = false;
    };

    /**
     * Plays a computer move after a short delay.
     * Ignored if cell has been taken, e.g by player move matched by an "else" node.
     */
    const playComputerMove = (move: Move, treeMove: TreeMove): void => {
        if (gameView.getStone(move) !== null) {
            return;
        }

        computerThinking.value = true;

        pendingMoveTimeout = setTimeout(() => {
            pendingMoveTimeout = null;
            computerThinking.value = false;
            pushMove({ move, color: computerColor, ...treeMove, byComputer: true });
        }, COMPUTER_ANSWER_DELAY_MS);
    };

    /**
     * Player move in a parallel sequence: started ones, and ones available from current main node.
     */
    const findParallelMove = (move: Move): null | Extract<TreeMove, { parallel: PuzzleNode }> => {
        const { node: treeNode, parallels } = treeState.value;
        const roots = new Set([...parallels.keys(), ...(treeNode === null ? [] : findParallels(treeNode))]);

        for (const parallel of roots) {
            const node = findChild(parallels.get(parallel) ?? parallel, move);

            if (node !== null) {
                return { node, parallel };
            }
        }

        return null;
    };

    const playMove = (move: Move): void => {
        if (computerThinking.value || gameView.getStone(move) !== null || puzzle.disabledCells.includes(move)) {
            return;
        }

        const { node: treeNode } = treeState.value;
        const color = nextColor.value;
        const child = treeNode === null ? null : findChild(treeNode, move);

        if (child !== null) {
            pushMove({ move, color, node: child, parallel: null, byComputer: false });

            const answer = color === playerColor ? getComputerAnswer(resolve(child)) : null;

            if (answer !== null) {
                playComputerMove(answer.move!, { node: answer, parallel: null });
            }

            return;
        }

        const parallelMove = color === playerColor ? findParallelMove(move) : null;

        if (parallelMove !== null) {
            const { node, parallel } = parallelMove;

            pushMove({ move, color, node, parallel, byComputer: false });

            const answer = getComputerAnswer(node);

            if (answer !== null) {
                playComputerMove(answer.move!, { node: answer, parallel });
            }

            return;
        }

        // Move not in tree: "else" node if any, else wrong move, or free move once ended
        const elseNode = treeNode === null || ended.value ? null : findElseNode(treeNode);

        pushMove({ move, color, node: elseNode, parallel: null, byComputer: false });

        if (elseNode !== null) {
            playComputerMove(elseNode.else, { node: elseNode, parallel: null });
        }
    };

    /**
     * Marks the cell of the next player move of the solution, and lets player play it.
     * If puzzle cannot be solved anymore from current position (wrong move, refutation...),
     * goes back to last position where it still can.
     */
    const hint = (): void => {
        if (computerThinking.value) {
            return;
        }

        // Player to play when an even number of moves have been played since line start
        let movesCount = path.value.length - (path.value.length - lineStartIndex.value) % 2;
        let solution: null | PuzzleNode[] = null;

        for (; movesCount >= lineStartIndex.value; movesCount -= 2) {
            const { result, node } = replay(path.value.slice(0, movesCount));

            solution = result === null && node !== null ? findSolution(node, resolve) : null;

            if (solution !== null) {
                break;
            }
        }

        if (!solution?.length) {
            return;
        }

        path.value = path.value.slice(0, movesCount);
        redraw();

        gameView.addEntity(
            new CircleMark(HINT_MARK_COLOR).setCoords(solution[0].move!),
            HINT_MARK_GROUP,
        );
    };

    /**
     * Cancel last player move, and computer answer, to try again from last position.
     */
    const undo = (): void => {
        // Also when computer is about to play line first move
        if (path.value.length <= lineStartIndex.value) {
            return;
        }

        cancelPendingMove();

        while (path.value.length > lineStartIndex.value && path.value[path.value.length - 1].byComputer) {
            path.value.pop();
        }

        if (path.value.length > lineStartIndex.value) {
            path.value.pop();
        }

        if (beforeLineSolved !== null && treeState.value.result !== 'solved') {
            pendingAlternatives.value = beforeLineSolved.pending;
            discoveredAnswers = beforeLineSolved.discovered;
            beforeLineSolved = null;
        }

        redraw();
    };

    /**
     * Computer plays first move from root, if it plays first.
     */
    const playFirstComputerMove = (): void => {
        const answer = computerPlaysFirst ? getComputerAnswer(puzzle.tree) : null;

        if (answer !== null) {
            playComputerMove(answer.move!, { node: answer, parallel: null });
        }
    };

    /**
     * Goes back to where next alternative answer is played, and plays it.
     */
    const nextAlternative = (): void => {
        const alternative = pendingAlternatives.value.shift();

        if (alternative === undefined) {
            return;
        }

        cancelPendingMove();
        beforeLineSolved = null;
        path.value = [...alternative.prefix];
        lineStartIndex.value = alternative.prefix.length + 1;
        currentAlternative.value = alternative.answer;
        ++lineNumber.value;
        redraw();
        playComputerMove(alternative.answer.move!, { node: alternative.answer, parallel: null });
    };

    /**
     * Restarts whole puzzle, alternatives included.
     */
    const restart = (): void => {
        cancelPendingMove();
        path.value = [];
        pendingAlternatives.value = [];
        discoveredAnswers = new Set();
        beforeLineSolved = null;
        lineStartIndex.value = initialLineStartIndex;
        currentAlternative.value = null;
        lineNumber.value = 1;
        redraw();
        playFirstComputerMove();
    };

    const hasSolution = findSolution(puzzle.tree, resolve, computerPlaysFirst) !== null;

    gameView.on('hexClicked', move => playMove(move));

    redraw();
    playFirstComputerMove();

    onUnmounted(() => {
        cancelPendingMove();
        playerSettingsFacade.destroy();
        gameView.destroy();
    });

    return {
        gameView: gameViewRef,
        status,
        ended,
        nextColor,
        messages,
        resultMessage,
        alternativeMove,
        lineNumber,
        playedMoves: computed(() => path.value.map(({ move }) => move)),
        canUndo: computed(() => path.value.length > lineStartIndex.value),
        canRestart: computed(() => path.value.length > initialLineStartIndex || lineNumber.value > 1),
        canHint: computed(() => hasSolution && !computerThinking.value && status.value !== 'solved' && status.value !== 'line_solved'),
        undo,
        restart,
        hint,
        nextAlternative,
    };
};
