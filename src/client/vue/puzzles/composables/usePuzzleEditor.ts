import { GameMarksFacade, GameView, PolicyOverlayFacade, TextMark } from '@playhex/pixi-board';
import { onKeyDown, useEventListener } from '@vueuse/core';
import { coordsToMove, type Move } from '@playhex/move-notation';
import { computed, onUnmounted, ref, shallowRef, toRaw, watch } from 'vue';
import { Game, Puzzle } from '../../../../shared/app/models/index.js';
import { getGamePosition } from '../../../../shared/app/puzzles/gamePosition.js';
import { createParallelsFinder, filterMoveNodes, findChild, findElseNode, findErrorNode, findSamePositionNode, findTranspositions, isDraftBlockingError, isElseNode, isParallelRoot, normalizePuzzleText, validatePuzzle, type PuzzleDefinition, type PuzzleElseNode, type PuzzleError, type PuzzleInput, type PuzzleNode } from '../../../../shared/app/puzzles/puzzleTree.js';
import { PlayerSettingsFacade } from '../../../services/board-view-facades/PlayerSettingsFacade.js';
import { drawPuzzlePosition, type ColoredMove } from '../services/puzzleBoard.js';
import type { AnalyzerInterface } from '../../hexplorer/analyzers/AnalyzerInterface.js';
import { AnalysisEngineUnavailableError, type AnalysisEngine } from '../../../../shared/app/hexplorer.js';
import type { PuzzleKatahexCheckState } from '../../../../shared/app/puzzles/puzzleKatahexCheck.js';
import { apiPuzzleKatahexCheck } from '../../../apiClient.js';
import { apiErrorMessage } from '../../../services/apiErrorMessage.js';

export type EditorStep = 'position' | 'tree' | 'publish';

/**
 * How a click on board edits initial position.
 */
export type PositionTool = 'red' | 'blue' | 'erase' | 'disable' | 'last_move';

type EditorNode = PuzzleNode | PuzzleElseNode;

const DEFAULT_BOARDSIZE = 11;

const PLANNED_MOVES_GROUP = 'planned_moves';
const KATAHEX_CHECK_POLL_INTERVAL_MS = 2000;
const AI_EVAL_COLOR = 0x22bb55;

/**
 * Copy of the tree without vue proxies, empty messages and undefined values,
 * to send to server.
 */
const cleanNode = <T extends EditorNode>(node: T): T => {
    const clean: Record<string, unknown> = {};

    if (isElseNode(node)) {
        clean.else = node.else;
    } else if (node.move) {
        clean.move = node.move;
    }

    if (node.message?.trim()) {
        clean.message = node.message.trim();
    }

    if (node.result) {
        clean.result = node.result;
    }

    if (!isElseNode(node) && node.children && node.children.length > 0) {
        clean.children = node.children.map(cleanNode);
    }

    // Keeps parallel sequences without moves, for drafts
    if (!isElseNode(node) && node.parallel && node.parallel.length > 0) {
        clean.parallel = node.parallel.map(cleanNode);
    }

    return clean as T;
};

/**
 * Create or edit a puzzle: set initial position (manually, or from a game),
 * then edit decision tree by playing moves on board.
 *
 * @param puzzle Puzzle to edit, or null to create a new one
 * @param sourceGame Game to create puzzle from
 * @param initialCollectionPublicId Collection to put created puzzle in
 */
export const usePuzzleEditor = (puzzle: null | Puzzle, sourceGame: null | Game, initialCollectionPublicId: null | string = null) => {
    const step = ref<EditorStep>(puzzle === null ? 'position' : 'tree');

    const title = ref(puzzle?.title ?? '');
    const description = ref(puzzle?.description ?? '');

    /**
     * Collection to put puzzle in, null for none.
     */
    const loadedCollectionPublicId = puzzle === null ? initialCollectionPublicId : puzzle.collection?.publicId ?? null;
    const collectionPublicId = ref<null | string>(loadedCollectionPublicId);

    /**
     * Saved state, changed only by saving.
     */
    const published = puzzle?.published ?? false;
    const boardsize = ref(puzzle?.boardsize ?? sourceGame?.boardsize ?? DEFAULT_BOARDSIZE);
    const redStones = ref<Move[]>(puzzle ? [...puzzle.redStones] : []);
    const blueStones = ref<Move[]>(puzzle ? [...puzzle.blueStones] : []);
    const disabledCells = ref<Move[]>(puzzle ? [...puzzle.disabledCells] : []);
    const lastMove = ref<null | Move>(puzzle?.lastMove ?? null);
    const playerColor = ref<0 | 1>(puzzle?.playerColor ?? 0);
    // toRaw: puzzle may come from a vue ref, and proxies cannot be cloned
    const tree = ref<PuzzleNode>(puzzle ? structuredClone(toRaw(puzzle.tree)) : {});

    const computerColor = computed<0 | 1>(() => playerColor.value === 0 ? 1 : 0);

    /*
     * Position from game
     */

    const sourceGameMovesCount = ref(sourceGame?.moves.length ?? 0);

    const setSourceGameMovesCount = (movesCount: number): void => {
        if (sourceGame === null) {
            return;
        }

        sourceGameMovesCount.value = Math.max(0, Math.min(sourceGame.moves.length, movesCount));

        const position = getGamePosition(sourceGame, sourceGameMovesCount.value);

        redStones.value = position.redStones;
        blueStones.value = position.blueStones;
        // Keep disabled cells, except where a stone has been played
        disabledCells.value = disabledCells.value.filter(move => !position.redStones.includes(move) && !position.blueStones.includes(move));
        lastMove.value = position.lastMove ?? null;
        playerColor.value = position.playerColor;
        redraw();
    };

    /*
     * Board
     */

    // GameView must not be a vue ref, see GameView.ts
    let gameView: GameView;
    let gameMarksFacade: GameMarksFacade;
    let policyOverlayFacade: PolicyOverlayFacade;
    let playerSettingsFacade: PlayerSettingsFacade;
    let mountedElement: null | HTMLElement = null;

    const createGameView = (): void => {
        gameView = new GameView(boardsize.value);
        gameMarksFacade = new GameMarksFacade(gameView);
        policyOverlayFacade = new PolicyOverlayFacade(gameView);
        // Not player colors, to not be confused with stones
        policyOverlayFacade.setMarkerColor(AI_EVAL_COLOR);
        playerSettingsFacade = new PlayerSettingsFacade(gameView);

        gameView.on('hexClicked', move => onHexClicked(move));
        gameView.on('hexPointerDown', move => onHexPointerDown(move));
        gameView.on('hexHovered', move => onHexHovered(move));
    };

    const destroyGameView = (): void => {
        playerSettingsFacade.destroy();
        gameView.destroy();
    };

    const mount = async (element: HTMLElement): Promise<void> => {
        mountedElement = element;
        await gameView.mount(element);
    };

    /**
     * Board size can only be changed from an empty position, as stones may not fit.
     */
    const setBoardsize = async (newBoardsize: number): Promise<void> => {
        boardsize.value = newBoardsize;
        redStones.value = [];
        blueStones.value = [];
        disabledCells.value = [];
        lastMove.value = null;
        tree.value = {};
        selectedPath.value = [];

        destroyGameView();
        createGameView();
        redraw();

        if (mountedElement) {
            await gameView.mount(mountedElement);
        }
    };

    /*
     * Tree
     */

    /**
     * Nodes from root (excluded) to selected node.
     */
    const selectedPath = ref<EditorNode[]>([]);

    /**
     * Next click on board defines the "else" answer of selected player choice.
     */
    const pickingElse = ref(false);

    const selectedNode = computed<EditorNode>(() => selectedPath.value[selectedPath.value.length - 1] ?? tree.value);

    const getParent = (path: EditorNode[]): PuzzleNode => path[path.length - 2] ?? tree.value;

    /**
     * Nodes of selected path having a move: parallel sequence root is not a move.
     */
    const selectedMoveNodes = computed(() => filterMoveNodes(selectedPath.value));

    /**
     * Color of the next move from selected node.
     */
    const nextColor = computed<0 | 1>(() => selectedMoveNodes.value.length % 2 === 0 ? playerColor.value : computerColor.value);

    /**
     * Whether selected node is in a parallel sequence, or is its root.
     */
    const isInParallel = computed(() => selectedPath.value.some(isParallelRoot));

    /**
     * Selected node is a parallel sequence root: it has no move, nor result or message.
     */
    const isParallelRootSelected = computed(() => selectedPath.value.length > 0 && isParallelRoot(selectedNode.value));

    /**
     * Whether selected node is in a continuation: puzzle already ended at an ancestor.
     */
    const isInContinuation = computed(() => selectedPath.value
        .slice(0, -1)
        .some(node => node.result !== undefined),
    );

    /**
     * "else" node can be added on player choice, out of continuation.
     */
    const canAddElse = computed(() => {
        const node = selectedNode.value;

        return !isElseNode(node)
            && nextColor.value === playerColor.value
            && !isInContinuation.value
            && node.result === undefined
            && findElseNode(node) === null
            && !transpositions.value.has(node)
            && !isInParallel.value
        ;
    });

    /**
     * Parallel sequence can be declared on a main sequence player choice, out of continuation.
     */
    const canAddParallel = computed(() => {
        const node = selectedNode.value;

        return !isElseNode(node)
            && nextColor.value === playerColor.value
            && !isInContinuation.value
            && !isInParallel.value
            && node.result === undefined
            && !transpositions.value.has(node)
        ;
    });

    /**
     * Moves of selected path, to display on board.
     * "else" node shows computer answer only, as player move can be any other move.
     */
    const selectedMoves = computed<ColoredMove[]>(() => selectedMoveNodes.value.map((node, index) => ({
        move: isElseNode(node) ? node.else : node.move!,
        color: index % 2 === 0 && !isElseNode(node) ? playerColor.value : computerColor.value,
    })));

    /**
     * Moves to reach the node selection jumped to, after a click on board reached a position already in tree.
     */
    const transpositionNotice = ref<null | Move[]>(null);

    const selectPath = (path: EditorNode[]): void => {
        selectedPath.value = path;
        pickingElse.value = false;
        transpositionNotice.value = null;
        redraw();
    };

    /**
     * Leaves continuing from another node reaching same position, see findTranspositions().
     */
    const transpositions = computed(() => findTranspositions(tree.value));

    const selectedTransposition = computed(() => isElseNode(selectedNode.value)
        ? null
        : transpositions.value.get(selectedNode.value) ?? null,
    );

    const goToTransposition = (): void => {
        if (selectedTransposition.value !== null) {
            selectPath(selectedTransposition.value.path);
        }
    };

    const selectParent = (): void => {
        selectPath(selectedPath.value.slice(0, -1));
    };

    const selectFirstChild = (): void => {
        const node = selectedNode.value;
        const firstChild = isElseNode(node) ? undefined : node.children?.[0] ?? node.parallel?.[0];

        if (firstChild) {
            selectPath([...selectedPath.value, firstChild]);
        }
    };

    /**
     * Select previous or next sibling, i.e upper or lower branch in tree.
     */
    const selectSibling = (offset: -1 | 1): void => {
        if (selectedPath.value.length === 0) {
            return;
        }

        const siblings = getSiblings();
        const sibling = siblings[siblings.indexOf(selectedNode.value) + offset];

        if (sibling) {
            selectPath([...selectedPath.value.slice(0, -1), sibling]);
        }
    };

    /**
     * Children list of selected node parent, to navigate or delete selected node.
     */
    const getSiblings = (): EditorNode[] => {
        const parent = getParent(selectedPath.value);
        const node = selectedNode.value;

        return !isElseNode(node) && parent.parallel?.includes(node)
            ? parent.parallel
            : parent.children!;
    };

    const deleteSelected = (): void => {
        if (selectedPath.value.length === 0) {
            return;
        }

        const siblings = getSiblings();

        siblings.splice(siblings.indexOf(selectedNode.value), 1);
        selectParent();
    };

    const startPickingElse = (): void => {
        pickingElse.value = true;
    };

    /**
     * Adds a parallel sequence on selected node, and selects it to add its moves.
     */
    const addParallel = (): void => {
        const node = selectedNode.value;

        if (!canAddParallel.value || isElseNode(node)) {
            return;
        }

        node.parallel ??= [];
        node.parallel.push({ children: [] });
        selectPath([...selectedPath.value, node.parallel[node.parallel.length - 1]]);
    };

    const removeResults = (nodes: EditorNode[] = []): void => {
        for (const node of nodes) {
            if (!isElseNode(node)) {
                delete node.result;
                removeResults(node.children);
                removeResults(node.parallel);
            }
        }
    };

    /**
     * Sets selected node result, or removes it with null.
     * Also removes descendants results, as they are now in a continuation.
     */
    const setResult = (result: null | 'solved' | 'failed'): void => {
        const node = selectedNode.value;

        if (isElseNode(node)) {
            return;
        }

        if (result === null) {
            delete node.result;
        } else {
            node.result = result;
            removeResults(node.children);
            removeResults(node.parallel);
        }
    };

    /**
     * Error shown after a click on board that cannot be applied.
     */
    const boardError = ref<null | 'only_one_answer'>(null);

    /**
     * Selects child, or the other node reaching same position if any, as only one of them can be continued.
     */
    const selectChild = (child: PuzzleNode): void => {
        // No transpositions in parallel sequences
        const other = isInParallel.value ? null : findSamePositionNode(tree.value, child);

        if (other === null) {
            selectPath([...selectedPath.value, child]);
            return;
        }

        selectPath(other.path);
        transpositionNotice.value = other.moves;
    };

    const onTreeHexClicked = (move: Move): void => {
        boardError.value = null;

        // Click on a stone of selected path: go back to this move
        const pathIndex = selectedPath.value.findIndex(node => (isElseNode(node) ? node.else : node.move) === move);

        if (pathIndex !== -1) {
            selectPath(selectedPath.value.slice(0, pathIndex + 1));
            return;
        }

        if (gameView.getStone(move) !== null || disabledCells.value.includes(move)) {
            return;
        }

        // Transposition cannot be continued: continue from the other node
        if (selectedTransposition.value !== null) {
            selectPath(selectedTransposition.value.path);
        }

        const node = selectedNode.value;

        if (isElseNode(node)) {
            return;
        }

        node.children ??= [];

        if (pickingElse.value) {
            const existing = findElseNode(node);

            if (existing === null) {
                node.children.push({ else: move });
                selectPath([...selectedPath.value, node.children[node.children.length - 1]]);
            } else {
                existing.else = move;
                selectPath([...selectedPath.value, existing]);
            }

            return;
        }

        const child = node.children.find(c => !isElseNode(c) && c.move === move);

        if (child) {
            selectChild(child);
            return;
        }

        // Computer has only one answer
        if (nextColor.value === computerColor.value && node.children.length > 0) {
            boardError.value = 'only_one_answer';
            return;
        }

        // Insert before "else" node, which must stay last
        const index = findElseNode(node) === null ? node.children.length : node.children.length - 1;

        node.children.splice(index, 0, { move });
        selectChild(node.children[index]);
    };

    /*
     * Position edition
     */

    const positionTool = ref<PositionTool>('red');

    /**
     * Removes stone or disabled cell.
     */
    const clearCell = (move: Move): void => {
        redStones.value = redStones.value.filter(m => m !== move);
        blueStones.value = blueStones.value.filter(m => m !== move);
        disabledCells.value = disabledCells.value.filter(m => m !== move);

        if (lastMove.value === move) {
            lastMove.value = null;
        }
    };

    const paintedCells = { red: redStones, blue: blueStones, disable: disabledCells };

    /**
     * Paints cells while pointer is held down, like Hexplorer setup mode (see DragPainter).
     * Starting on a cell already set by the tool removes along the way instead,
     * e.g starting on a red stone with red tool removes red stones only.
     * Null when not painting.
     */
    let painting: null | { tool: Exclude<PositionTool, 'last_move'>, add: boolean } = null;

    const paintCell = (move: Move): void => {
        const { tool, add } = painting!;

        if (tool === 'erase') {
            clearCell(move);
        } else {
            const cells = paintedCells[tool];

            if (cells.value.includes(move) === add) {
                return;
            }

            clearCell(move);

            if (add) {
                cells.value.push(move);
            }
        }

        redraw();
    };

    function onHexPointerDown(move: Move): void
    {
        const tool = positionTool.value;

        if (step.value !== 'position' || tool === 'last_move') {
            return;
        }

        painting = { tool, add: tool !== 'erase' && !paintedCells[tool].value.includes(move) };
        paintCell(move);
    }

    function onHexHovered(move: Move): void
    {
        if (painting !== null) {
            paintCell(move);
        }
    }

    useEventListener(document, 'pointerup', () => {
        painting = null;
    });

    /**
     * Only for last move tool, other tools paint on pointer down.
     */
    const onPositionHexClicked = (move: Move): void => {
        if (positionTool.value !== 'last_move') {
            return;
        }

        // Last move must be an opponent stone
        if ((computerColor.value === 0 ? redStones : blueStones).value.includes(move)) {
            lastMove.value = lastMove.value === move ? null : move;
            redraw();
        }
    };

    const clearLastMove = (): void => {
        lastMove.value = null;
        redraw();
    };

    const setPlayerColor = (color: 0 | 1): void => {
        playerColor.value = color;

        // Last move must stay an opponent stone
        if (lastMove.value !== null && !(color === 0 ? blueStones : redStones).value.includes(lastMove.value)) {
            lastMove.value = null;
        }

        redraw();
    };

    const setStep = (newStep: EditorStep): void => {
        step.value = newStep;
        pickingElse.value = false;
        redraw();
    };

    function onHexClicked(move: Move): void
    {
        if (step.value === 'position') {
            onPositionHexClicked(move);
        } else {
            onTreeHexClicked(move);
        }
    }

    function redraw(): void
    {
        const position = { boardsize: boardsize.value, redStones: redStones.value, blueStones: blueStones.value, disabledCells: disabledCells.value };
        const moves = step.value === 'tree' ? selectedMoves.value : [];

        drawPuzzlePosition(gameView, position, moves);

        const markedMove = moves[moves.length - 1]?.move ?? lastMove.value;

        if (markedMove === null) {
            gameMarksFacade.hideMarks();
        } else {
            gameMarksFacade.markLastMove(markedMove);
        }

        drawPlannedMoves();
        void updateAnalysis();
    }

    /*
     * Planned moves: next moves already in tree, shown as letters (A, B, C...).
     * With AI eval, engine moves without letter are viable moves missing in tree.
     */

    /**
     * Engine used to analyze player choices, null for no analysis.
     */
    const analyzer = shallowRef<null | AnalyzerInterface>(null);
    const analysisLoading = ref(false);
    const analysisError = ref<null | 'engine_unavailable' | 'failed'>(null);

    /**
     * Next moves from selected node that are already in tree.
     * "else" node is not planned: a viable move falling into it is what we want to spot.
     */
    const getPlannedMoves = (): Set<Move> => {
        const node = selectedTransposition.value?.target ?? selectedNode.value;
        const planned = new Set<Move>();

        if (isElseNode(node)) {
            return planned;
        }

        const addChildrenMoves = (parent: PuzzleNode): void => {
            for (const child of parent.children ?? []) {
                if (!isElseNode(child) && child.move) {
                    planned.add(child.move);
                }
            }
        };

        addChildrenMoves(node);

        // Parallel sequences can be started on player turn, from any main sequence node of their subtree
        if (nextColor.value === playerColor.value && !isInParallel.value) {
            for (const parallelRoot of createParallelsFinder(tree.value)(node)) {
                addChildrenMoves(parallelRoot);
            }
        }

        return planned;
    };

    const drawPlannedMoves = (): void => {
        gameView.removeEntitiesGroup(PLANNED_MOVES_GROUP);

        if (step.value !== 'tree') {
            return;
        }

        let index = 0;

        for (const move of getPlannedMoves()) {
            const letter = String.fromCharCode('A'.charCodeAt(0) + index++);

            gameView.addEntity(new TextMark(letter).setCoords(move), PLANNED_MOVES_GROUP);
        }
    };

    /*
     * AI eval: shows where engine would play
     */

    /**
     * Whether selected position can be analyzed, for player or computer move, also after puzzle ended.
     * Not on "else" node, as player move to reach it is unknown.
     */
    const shouldAnalyze = (): boolean => {
        // Transposition continues from its target
        const node = selectedTransposition.value?.target ?? selectedNode.value;

        return step.value === 'tree'
            && !isElseNode(node)
        ;
    };

    // Incremented on every analysis, so a slow request can detect a newer one started and discard its result
    let analysisRequestId = 0;

    const updateAnalysis = async (): Promise<void> => {
        policyOverlayFacade.clear();

        const requestId = ++analysisRequestId;
        const currentAnalyzer = analyzer.value;

        analysisError.value = null;

        if (currentAnalyzer === null || !shouldAnalyze()) {
            analysisLoading.value = false;
            return;
        }

        const red = [...redStones.value];
        const blue = [...blueStones.value];

        for (const { move, color } of selectedMoves.value) {
            (color === 0 ? red : blue).push(move);
        }

        const color = nextColor.value === 0 ? 'black' : 'white';
        const disabled = new Set(disabledCells.value);

        analysisLoading.value = true;

        let policy: undefined | number[][];

        try {
            ({ policy } = await currentAnalyzer.analyzePosition({ size: boardsize.value, color, black: red, white: blue }));
        } catch (e) {
            if (requestId !== analysisRequestId) {
                return;
            }

            analysisLoading.value = false;

            if (e instanceof AnalysisEngineUnavailableError) {
                analysisError.value = 'engine_unavailable';
                return;
            }

            analysisError.value = 'failed';

            // eslint-disable-next-line no-console
            console.error('Error while analyzing position', e);
            return;
        }

        if (requestId !== analysisRequestId) {
            return;
        }

        analysisLoading.value = false;

        if (policy) {
            policyOverlayFacade.apply(policy, color, (row, col) => !disabled.has(coordsToMove({ row, col })));
        }
    };

    const setAnalyzer = (newAnalyzer: null | AnalyzerInterface): void => {
        if (newAnalyzer === analyzer.value) {
            return;
        }

        analyzer.value?.persistCache?.();
        analyzer.value = newAnalyzer;
        void updateAnalysis();
    };


    /*
     * Save
     */

    const toInput = (publish: boolean): PuzzleInput => ({
        title: normalizePuzzleText(title.value),
        description: normalizePuzzleText(description.value),
        boardsize: boardsize.value,
        redStones: redStones.value,
        blueStones: blueStones.value,
        disabledCells: disabledCells.value,
        lastMove: lastMove.value,
        playerColor: playerColor.value,
        tree: cleanNode(tree.value),
        published: publish,
        gamePublicId: puzzle === null ? sourceGame?.publicId ?? null : undefined,
        // Sent only if changed, to not move back puzzle to its previous collection
        // if it has been changed from collection page meanwhile
        collectionPublicId: puzzle !== null && collectionPublicId.value === loadedCollectionPublicId
            ? undefined
            : collectionPublicId.value,
    });

    /**
     * All errors, preventing publishing.
     */
    const errors = computed<PuzzleError[]>(() => validatePuzzle(toInput(published)));

    /**
     * Errors preventing saving, even as a draft.
     */
    const draftErrors = computed(() => errors.value.filter(isDraftBlockingError));

    /**
     * Errors by tree node, to highlight nodes and show their errors.
     */
    const nodeErrors = computed(() => {
        const map = new Map<EditorNode, PuzzleError[]>();

        for (const error of errors.value) {
            const node = findErrorNode(tree.value, error);

            if (node !== null) {
                map.set(node, [...map.get(node) ?? [], error]);
            }
        }

        return map;
    });

    /**
     * Selects tree node where this error is, in tree step.
     * Does nothing if error is not in tree, or in a parallel sequence.
     */
    const selectErrorNode = (error: PuzzleError<string>): void => {
        if (error.path === undefined || error.parallel !== undefined) {
            return;
        }

        const path: EditorNode[] = [];
        let node: PuzzleNode = tree.value;

        for (const move of error.path) {
            const child = findChild(node, move);

            if (child === null) {
                return;
            }

            path.push(child);
            node = child;
        }

        const child = error.child === undefined ? undefined : node.children?.[error.child];

        if (child !== undefined) {
            path.push(child);
        }

        setStep('tree');
        selectPath(path);
    };

    /*
     * Katahex check: warnings on tree logic, not blocking publishing
     */

    const toDefinition = (): PuzzleDefinition => {
        const { title, description, boardsize, redStones, blueStones, disabledCells, lastMove, playerColor, tree } = toInput(published);

        return { title, description, boardsize, redStones, blueStones, disabledCells, lastMove, playerColor, tree };
    };

    /**
     * Changes when position or tree changes, to invalidate katahex check results.
     */
    const katahexCheckKey = computed(() => {
        const { boardsize, redStones, blueStones, disabledCells, playerColor, tree } = toDefinition();

        return JSON.stringify(
            { boardsize, redStones, blueStones, disabledCells, playerColor, tree },
            (key, value: unknown) => key === 'message' ? undefined : value,
        );
    });

    const katahexCheck = ref<null | PuzzleKatahexCheckState>(null);
    const katahexCheckError = ref<null | string>(null);
    const katahexChecking = ref(false);

    /**
     * Incremented to stop polling a previous check.
     */
    let katahexCheckRun = 0;

    const resetKatahexCheck = (): void => {
        ++katahexCheckRun;
        katahexCheck.value = null;
        katahexCheckError.value = null;
        katahexChecking.value = false;
    };

    watch(katahexCheckKey, resetKatahexCheck);

    /**
     * Runs katahex check on server, polls until done.
     * Fast when run again, as analyzes are cached on server.
     */
    const runKatahexCheck = async (engine: AnalysisEngine): Promise<void> => {
        resetKatahexCheck();

        const run = katahexCheckRun;
        const input = { puzzle: toDefinition(), engine };

        katahexChecking.value = true;

        try {
            for (;;) {
                const state = await apiPuzzleKatahexCheck(input);

                if (run !== katahexCheckRun) {
                    return;
                }

                katahexCheck.value = state;

                if (state.status !== 'running') {
                    break;
                }

                await new Promise(resolve => setTimeout(resolve, KATAHEX_CHECK_POLL_INTERVAL_MS));

                if (run !== katahexCheckRun) {
                    return;
                }
            }

            if (katahexCheck.value?.status === 'failed') {
                katahexCheckError.value = katahexCheck.value.error ?? null;
            }
        } catch (e) {
            if (run === katahexCheckRun) {
                katahexCheckError.value = apiErrorMessage(e);
            }
        } finally {
            if (run === katahexCheckRun) {
                katahexChecking.value = false;
            }
        }
    };

    /*
     * Keyboard: rewind source game in position step, navigate tree in tree step
     */

    /**
     * Arrows must keep moving caret when typing in a field (title, message...).
     */
    const isTyping = (e: KeyboardEvent): boolean => {
        const target = e.target as HTMLElement | null;

        return !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    };

    const arrowShortcut = (onPosition: null | (() => void), onTree: () => void) => (e: KeyboardEvent): void => {
        if (isTyping(e)) {
            return;
        }

        const run = step.value === 'position' ? onPosition : step.value === 'tree' ? onTree : null;

        if (run === null) {
            return;
        }

        e.preventDefault();
        run();
    };

    // Rewind only when creating from a game, as edited puzzle has no game moves loaded
    const rewind = (offset: -1 | 1): null | (() => void) => puzzle === null && sourceGame !== null
        ? () => setSourceGameMovesCount(sourceGameMovesCount.value + offset)
        : null
    ;

    onKeyDown('ArrowLeft', arrowShortcut(rewind(-1), selectParent));
    onKeyDown('ArrowRight', arrowShortcut(rewind(1), selectFirstChild));
    onKeyDown('ArrowUp', arrowShortcut(null, () => selectSibling(-1)));
    onKeyDown('ArrowDown', arrowShortcut(null, () => selectSibling(1)));

    createGameView();

    if (puzzle === null && sourceGame !== null) {
        setSourceGameMovesCount(sourceGame.moves.length);
    } else {
        redraw();
    }

    onUnmounted(() => {
        // Stop polling katahex check
        ++katahexCheckRun;
        analyzer.value?.persistCache?.();
        destroyGameView();
    });

    return {
        mount,
        step,
        setStep,

        title,
        description,
        collectionPublicId,
        published,
        boardsize,
        setBoardsize,
        redStones,
        blueStones,
        disabledCells,
        playerColor,
        setPlayerColor,
        lastMove,
        clearLastMove,
        positionTool,
        sourceGameMovesCount,
        setSourceGameMovesCount,

        tree,
        selectedPath,
        selectedNode,
        selectPath,
        selectParent,
        nextColor,
        isInContinuation,
        isInParallel,
        isParallelRootSelected,
        canAddElse,
        canAddParallel,
        addParallel,
        pickingElse,
        startPickingElse,
        setResult,
        deleteSelected,
        boardError,
        transpositions,
        selectedTransposition,
        goToTransposition,
        transpositionNotice,

        errors,
        draftErrors,
        nodeErrors,
        selectErrorNode,
        toInput,

        katahexCheck,
        katahexCheckError,
        katahexChecking,
        runKatahexCheck,

        analyzer,
        setAnalyzer,
        analysisLoading,
        analysisError,
    };
};
