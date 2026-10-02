import { CircleMark, GameMarksFacade, GameView } from '@playhex/pixi-board';
import type { Move } from '@playhex/move-notation';
import { computed, onUnmounted, ref, shallowRef } from 'vue';
import { Puzzle } from '../../../../shared/app/models/index.js';
import { findChild, findElseNode, findSolution, getComputerAnswer, getNodeResult, isElseNode, type PuzzleElseNode, type PuzzleNode, type PuzzleResult } from '../../../../shared/app/puzzles/puzzleTree.js';
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
type PlayedMove = ColoredMove & {
    /**
     * Tree node reached by this move.
     * An "else" node is set on both player move and computer answer.
     * Null if move is not in tree: wrong move, or any move played after the end.
     */
    node: null | PuzzleNode | PuzzleElseNode;

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

    const path = ref<PlayedMove[]>([]);

    const computerThinking = ref(false);

    /**
     * Computer answer about to be played.
     */
    let pendingMoveTimeout: null | ReturnType<typeof setTimeout> = null;

    /**
     * Follows played moves in tree:
     * result of the first ending node, and current tree node (null if moves left the tree).
     */
    const treeState = computed((): { result: null | PuzzleResult, node: null | PuzzleNode } => {
        let result: null | PuzzleResult = null;
        let node: null | PuzzleNode = puzzle.tree;

        for (const playedMove of path.value) {
            if (playedMove.node === null || isElseNode(playedMove.node)) {
                result ??= 'failed';
                node = null;
                continue;
            }

            result ??= getNodeResult(playedMove.node);
            node = playedMove.node;
        }

        return { result, node };
    });

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
     * Messages of nodes reached by last player move and computer answer,
     * or root message at start.
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
            .map(node => node?.message)
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
    const playComputerMove = (move: Move, node: PuzzleNode | PuzzleElseNode): void => {
        if (gameView.getStone(move) !== null) {
            return;
        }

        computerThinking.value = true;

        pendingMoveTimeout = setTimeout(() => {
            pendingMoveTimeout = null;
            computerThinking.value = false;
            path.value.push({ move, color: computerColor, node, byComputer: true });
            redraw();
        }, COMPUTER_ANSWER_DELAY_MS);
    };

    const playMove = (move: Move): void => {
        if (computerThinking.value || gameView.getStone(move) !== null) {
            return;
        }

        const { node: treeNode } = treeState.value;
        const color = nextColor.value;
        const child = treeNode === null ? null : findChild(treeNode, move);

        if (child !== null) {
            path.value.push({ move, color, node: child, byComputer: false });
            redraw();

            const answer = color === playerColor ? getComputerAnswer(child) : null;

            if (answer !== null) {
                playComputerMove(answer.move!, answer);
            }

            return;
        }

        // Move not in tree: "else" node if any, else wrong move, or free move once ended
        const elseNode = treeNode === null || ended.value ? null : findElseNode(treeNode);

        path.value.push({ move, color, node: elseNode, byComputer: false });
        redraw();

        if (elseNode !== null) {
            playComputerMove(elseNode.else, elseNode);
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

        // Moves in tree, before puzzle ended
        const nodes: PuzzleNode[] = [];

        for (const { node } of path.value) {
            if (node === null || isElseNode(node) || getNodeResult(node) !== null) {
                break;
            }

            nodes.push(node);
        }

        let solution = findSolution(puzzle.tree);

        // Player to play is when an even number of moves have been played
        while (nodes.length > 0) {
            const nodeSolution = nodes.length % 2 === 0 ? findSolution(nodes[nodes.length - 1]) : null;

            if (nodeSolution !== null) {
                solution = nodeSolution;
                break;
            }

            nodes.pop();
        }

        if (!solution?.length) {
            return;
        }

        path.value = path.value.slice(0, nodes.length);
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

    const hasSolution = findSolution(puzzle.tree) !== null;

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
        canUndo: computed(() => path.value.length > 0),
        canHint: computed(() => hasSolution && !computerThinking.value && status.value !== 'solved'),
        undo,
        restart,
        hint,
    };
};
