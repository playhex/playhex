import { CircleMark, GameMarksFacade, GameView } from '@playhex/pixi-board';
import type { Move } from '@playhex/move-notation';
import { computed, onUnmounted, ref, shallowRef } from 'vue';
import { Puzzle } from '../../../../shared/app/models/index.js';
import { createNodeResolver, createParallelsFinder, findChild, findElseNode, findSolution, getComputerAnswer, getNodeResult, getParallelNodeResult, isElseNode, type PuzzleElseNode, type PuzzleNode, type PuzzleResult } from '../../../../shared/app/puzzles/puzzleTree.js';
import { PlayerSettingsFacade } from '../../../services/board-view-facades/PlayerSettingsFacade.js';
import { drawPuzzlePosition, type ColoredMove } from '../services/puzzleBoard.js';

export type PuzzleStatus =
    'player_turn'
    | 'computer_turn'
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
 */
export const usePuzzle = (puzzle: Puzzle) => {
    const playerColor = puzzle.playerColor;
    const computerColor: 0 | 1 = playerColor === 0 ? 1 : 0;

    /*
     * GameView must not be a vue ref, see GameView.ts.
     * The shallowRef is only exposed for template.
     */
    const gameView = new GameView(puzzle.boardsize);
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

    const nextColor = computed<0 | 1>(() => path.value.length % 2 === 0 ? playerColor : computerColor);

    const status = computed<PuzzleStatus>(() => {
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
        if (path.value.length === 0) {
            return puzzle.tree.message ? [puzzle.tree.message] : [];
        }

        let lastPlayerMoveIndex = path.value.length - 1;

        while (lastPlayerMoveIndex > 0 && path.value[lastPlayerMoveIndex].byComputer) {
            --lastPlayerMoveIndex;
        }

        // Set to show "else" node message once, it is on both player move and computer answer
        return [...new Set(path.value.slice(lastPlayerMoveIndex).map(({ node }) => node))]
            .filter(node => node !== treeState.value.resultNode)
            .map(getNodeMessage)
            .filter((message): message is string => !!message)
        ;
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
            path.value.push({ move, color: computerColor, ...treeMove, byComputer: true });
            redraw();
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
            path.value.push({ move, color, node: child, parallel: null, byComputer: false });
            redraw();

            const answer = color === playerColor ? getComputerAnswer(resolve(child)) : null;

            if (answer !== null) {
                playComputerMove(answer.move!, { node: answer, parallel: null });
            }

            return;
        }

        const parallelMove = color === playerColor ? findParallelMove(move) : null;

        if (parallelMove !== null) {
            const { node, parallel } = parallelMove;

            path.value.push({ move, color, node, parallel, byComputer: false });
            redraw();

            const answer = getComputerAnswer(node);

            if (answer !== null) {
                playComputerMove(answer.move!, { node: answer, parallel });
            }

            return;
        }

        // Move not in tree: "else" node if any, else wrong move, or free move once ended
        const elseNode = treeNode === null || ended.value ? null : findElseNode(treeNode);

        path.value.push({ move, color, node: elseNode, parallel: null, byComputer: false });
        redraw();

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

        // Player to play is when an even number of moves have been played
        let movesCount = path.value.length - path.value.length % 2;
        let solution: null | PuzzleNode[] = null;

        for (; movesCount >= 0; movesCount -= 2) {
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
        cancelPendingMove();

        while (path.value[path.value.length - 1]?.byComputer) {
            path.value.pop();
        }

        path.value.pop();

        redraw();
    };

    const restart = (): void => {
        cancelPendingMove();
        path.value = [];
        redraw();
    };

    const hasSolution = findSolution(puzzle.tree, resolve) !== null;

    gameView.on('hexClicked', move => playMove(move));

    redraw();

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
        canUndo: computed(() => path.value.length > 0),
        canHint: computed(() => hasSolution && !computerThinking.value && status.value !== 'solved'),
        undo,
        restart,
        hint,
    };
};
