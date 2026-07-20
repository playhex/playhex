import { GameView, PlayingGameFacade } from '@playhex/pixi-board';
import { parseHexworldString } from '../../../../shared/app/hexworld.js';
import { HexMove } from '../../../../shared/move-notation/hex-move-notation.js';
import { computed, Ref, ref, shallowRef, watch } from 'vue';
import { ToolInterface } from '../tools/ToolInterface.js';
import { PlaceStonesAlternatelyTool } from '../tools/PlaceStonesAlternatelyTool.js';
import { RemoveStoneTool } from '../tools/RemoveStoneTool.js';
import { PlayerSettingsFacade } from '../../../services/board-view-facades/PlayerSettingsFacade.js';
import { PolicyOverlayFacade } from '../../../../shared/pixi-board/facades/PolicyOverlayFacade.js';
import { UndoableActionsStack } from '../undoredo/undoredo.js';
import { coordsToMove, Move } from '../../../../shared/move-notation/move-notation.js';
import { onKeyDown, useEventListener } from '@vueuse/core';
import { createHexplorerState, HexplorerState } from '../HexplorerState.js';
import { ImportedGame } from '../../../../shared/app/hex-game-importer/types.js';
import { GameTree, ROOT_ID, SetupStone, TreeNode } from '../GameTree.js';
import Game from '../../../../shared/game-engine/Game.js';
import { AnalyzerInterface } from '../analyzers/AnalyzerInterface.js';
import { onBeforeRouteLeave } from 'vue-router';
import { BoardMarksLayer, MarkType } from '../BoardMarksLayer.js';
import { PlaceMarkTool } from '../tools/PlaceMarkTool.js';
import { gameTreeToSgf } from '../exportSgf.js';
import { sgfToString } from '../../../../shared/sgf/index.js';
import { downloadString } from '../../../services/fileDownload.js';

export const useHexplorer = (fromHash?: string, analyzer: AnalyzerInterface | null = null) => {
    /**
     * Actions made so far while in setup mode (scratch editing, not yet validated into the tree).
     * Can be undo/redo.
     */
    const actionsStack = ref(new UndoableActionsStack());

    // Raw, plain state, passed to tools so they can mutate it directly.
    const state = ref<HexplorerState>(createHexplorerState());

    const currentTool = shallowRef<ToolInterface>(null!);
    const whiteWin = ref<number | undefined>(0.5);
    const analysisLoading = ref(false);

    // The analyzer currently used to compute winrate/policy. Can be swapped at runtime
    // (see setAnalyzer), e.g to disable analysis (NoopAnalyzer) or change engine.
    const currentAnalyzer = shallowRef<AnalyzerInterface | null>(analyzer);


    // Branching move history. currentNodeId is the position currently displayed on the board.
    // Both the tree nodes and the current position live in `state`, so it can be serialized
    // as a whole (see exportAnalysis): the tree reads/writes its node list directly through
    // state, and currentNodeId is a writable view over state.
    const tree = new GameTree(computed<TreeNode[]>({
        get: () => state.value.nodes,
        set: nodes => { state.value.nodes = nodes; },
    }));
    const currentNodeId = computed<number>({
        get: () => state.value.currentNodeId,
        set: id => { state.value.currentNodeId = id; },
    });

    // Evaluation cache, keyed by tree node id, filled in progressively as positions are analyzed.
    const evalsByNodeId = ref(new Map<number, number>());

    // Mutable game instances, updated when the board is rebuilt or navigated.
    let gameView: GameView = null!;
    let playingGameFacade: PlayingGameFacade = null!;
    let policyOverlayFacade: PolicyOverlayFacade = null!;
    let marksLayer: BoardMarksLayer = null!;

    // Drag-paint state: active when the user holds the pointer down over cells in setup mode.
    // Each visited cell's per-cell UndoableAction is stored so the whole drag can be
    // registered as a single undo/redo entry when the pointer is released.
    let isDragPainting = false;
    let dragMode: 'add' | 'remove' | null = null;
    const dragCellActions = new Map<Move, { do: () => void, undo: () => void }>();

    const endDragPainting = async (): Promise<void> => {
        if (!isDragPainting) {
            return;
        }

        const actions = [...dragCellActions.values()];

        isDragPainting = false;
        dragMode = null;
        dragCellActions.clear();

        if (actions.length === 0) {
            return;
        }

        // Revert live changes so pushAndDo can re-apply them via do().
        for (const a of [...actions].reverse()) a.undo();

        await actionsStack.value.pushAndDo({
            do: () => { for (const a of actions) a.do(); },
            undo: () => { for (const a of [...actions].reverse()) a.undo(); },
        });

        await updateAnalysis();
    };

    useEventListener(document, 'pointerup', () => { void endDragPainting(); });

    // Reactive ref exposed to the template
    const gameViewRef = shallowRef<GameView>(null!);

    // Tracks the mounted DOM element so we can remount after a board rebuild
    let mountedElement: HTMLElement | null = null;

    onBeforeRouteLeave(() => currentAnalyzer.value?.persistCache?.());

    // Leaf of the line currently shown in the evaluation graph (root → leaf).
    // The graph follows this whole line; navigating back/forward only moves a cursor
    // within it (currentNodeId), without truncating the moves that follow.
    const lineLeafId = ref(ROOT_ID);

    const descendToLeaf = (id: number): number => {
        let node = tree.getNode(id);

        while (node.children.length > 0) {
            node = tree.getNode(node.children[0]);
        }

        return node.id;
    };

    const isAncestorOrSelf = (nodeId: number, ofId: number): boolean =>
        tree.getPath(ofId).some(node => node.id === nodeId);

    /**
     * Sets the currently displayed node, keeping the full evaluation-graph line intact
     * when navigating within it. Only re-anchors the line (down to a leaf) when moving
     * onto a different line, or when the previous leaf no longer exists (e.g deleted).
     */
    const setCurrentNode = (id: number): void => {
        currentNodeId.value = id;

        const leafExists = tree.nodes.value.some(node => node.id === lineLeafId.value);

        if (!leafExists || !isAncestorOrSelf(id, lineLeafId.value)) {
            lineLeafId.value = descendToLeaf(id);
        }
    };

    /**
     * The line currently shown in the evaluation graph: root → tracked leaf.
     */
    const currentLine = computed<TreeNode[]>(() => tree.getPath(lineLeafId.value));

    /**
     * Evaluation history graph, for the whole current line (not just up to the displayed node).
     */
    const evalHistory = computed<number[]>(() =>
        currentLine.value.map(node => evalsByNodeId.value.get(node.id) ?? 0.5),
    );

    const evalCursorIndex = computed<number>(() =>
        currentLine.value.findIndex(node => node.id === currentNodeId.value),
    );

    /**
     * Reads stones directly from the given game view's visual board state.
     * Unlike playingGameFacade.getMoves(), this also reflects stones placed
     * directly on the view in setup mode.
     */
    const getBoardStones = (gv: GameView): { black: Move[], white: Move[] } => {
        const black: Move[] = [];
        const white: Move[] = [];

        for (let i = 0; i < gv.getBoardsize(); ++i) {
            for (let j = 0; j < gv.getBoardsize(); ++j) {
                const move = coordsToMove({ row: j, col: i });
                const stone = gv.getStone(move);

                if (!stone) {
                    continue;
                }

                if (stone.getPlayerIndex() === 0) black.push(move);
                if (stone.getPlayerIndex() === 1) white.push(move);
            }
        }

        return { black, white };
    };

    const clearBoard = (): void => {
        const { black, white } = getBoardStones(gameView);

        for (const move of black) gameView.setStone(move, null);
        for (const move of white) gameView.setStone(move, null);
    };

    /**
     * Directly places stones on the view, bypassing playingGameFacade
     * (setup nodes aren't alternating moves).
     */
    const applySetupStones = (stones: SetupStone[]): void => {
        for (const { move, color } of stones) {
            gameView.setStone(move, color);
        }
    };

    // Incremented on every updateAnalysis() call, so a slow/stale request can detect
    // a newer one has since started and discard its own (possibly out-of-order) result.
    let analysisRequestId = 0;

    const updateAnalysis = async (): Promise<void> => {
        policyOverlayFacade.clear();

        const analyzer = currentAnalyzer.value;
        const player = state.value.currentPlayer;
        const showWinrate = state.value.winrateEnabled[player];
        const showPolicy = state.value.policyEnabled[player];

        // Nothing to display for the color to move: hide the winrate bar.
        if (!analyzer || (!showWinrate && !showPolicy)) {
            whiteWin.value = undefined;
            return;
        }

        const requestId = ++analysisRequestId;
        const nodeId = currentNodeId.value;
        const { black, white } = getBoardStones(gameView);
        const color = player === 0 ? 'black' : 'white';
        const size = gameView.getBoardsize();

        analysisLoading.value = true;

        const result = await analyzer.analyzePosition({ size, color, black, white });

        if (requestId !== analysisRequestId) {
            return; // a newer request has started since; this result is stale, discard it
        }

        analysisLoading.value = false;
        whiteWin.value = showWinrate ? result.whiteWin : undefined;

        if (showPolicy && result.policy) {
            policyOverlayFacade.setShowNumbers(state.value.policyShowNumbers);
            policyOverlayFacade.setShowBestMark(state.value.policyShowBestMark);
            policyOverlayFacade.apply(result.policy, color);
        }

        if (showWinrate && typeof result.whiteWin === 'number') {
            evalsByNodeId.value.set(nodeId, result.whiteWin);
        }
    };

    /**
     * Replays moves on a headless Game instance (independent of the visible GameView)
     * and returns the black/white stones currently on its board.
     */
    const getBlackWhiteFromGame = (game: Game): { black: Move[], white: Move[] } => {
        const cells = game.getBoard().getCells();
        const black: Move[] = [];
        const white: Move[] = [];

        for (let row = 0; row < cells.length; ++row) {
            for (let col = 0; col < cells[row].length; ++col) {
                const player = cells[row][col];

                if (player === null) {
                    continue;
                }

                const move = coordsToMove({ row, col });

                (player === 0 ? black : white).push(move);
            }
        }

        return { black, white };
    };

    /**
     * Applies a single tree node (setup or move) onto a headless Game instance.
     * Returns false if the move was illegal, meaning replay should stop here.
     */
    const applyNodeToGame = (game: Game, node: TreeNode): boolean => {
        if (node.data === null) {
            return true;
        }

        if (node.data.type === 'setup') {
            for (const stone of node.data.stones) {
                game.getBoard().setCell(stone.move, stone.color);
            }
            game.setCurrentPlayerIndex(node.data.nextPlayer);
            return true;
        }

        try {
            game.move(node.data.move, game.getCurrentPlayerIndex());
            return true;
        } catch {
            return false;
        }
    };

    /**
     * Replays the path from root to the given node on a headless Game instance,
     * so its win/end state can be inspected (used to stop auto-play on a finished game).
     */
    const buildGameAt = (nodeId: number): Game => {
        const game = new Game(gameView.getBoardsize());

        for (const node of tree.getPath(nodeId)) {
            if (!applyNodeToGame(game, node)) {
                break;
            }
        }

        return game;
    };

    /**
     * Computes/caches the evaluation of every not-yet-cached ancestor along the given path
     * (the path's last node, i.e the currently displayed one, is left to updateAnalysis()).
     * Runs on a headless Game instance, independent of the visible board, so it can run in
     * the background without blocking or racing with further navigation.
     */
    const fillAncestorEvals = async (path: TreeNode[]): Promise<void> => {
        const analyzer = currentAnalyzer.value;

        if (!analyzer) {
            return;
        }

        const boardsize = gameView.getBoardsize();
        const game = new Game(boardsize);

        for (let i = 0; i < path.length - 1; ++i) {
            const node = path[i];

            if (!applyNodeToGame(game, node)) {
                break;
            }

            if (evalsByNodeId.value.has(node.id)) {
                continue;
            }

            const { black, white } = getBlackWhiteFromGame(game);
            const result = await analyzer.analyzePosition({
                size: boardsize,
                color: game.getCurrentPlayerIndex() === 0 ? 'black' : 'white',
                black,
                white,
            });

            if (typeof result.whiteWin === 'number') {
                evalsByNodeId.value.set(node.id, result.whiteWin);
            }
        }
    };

    /**
     * Creates a PlaceStonesAlternatelyTool sharing the same state,
     * so it can update state.currentPlayer directly on each placement.
     */
    const createAlternatingTool = (): PlaceStonesAlternatelyTool => {
        return new PlaceStonesAlternatelyTool(gameView, state.value);
    };

    const createRemoveStoneTool = (): RemoveStoneTool => {
        return new RemoveStoneTool(gameView);
    };

    /**
     * Creates a tool that toggles the given mark type on clicked cells.
     */
    const createMarkTool = (markType: MarkType, text?: string | Ref<string>): PlaceMarkTool => {
        return new PlaceMarkTool(marksLayer, markType, text);
    };

    /**
     * Swaps the analyzer used to compute winrate/policy at runtime.
     * Cached evaluations are dropped (a different engine yields different numbers)
     * and the current position (plus its ancestors) is re-analyzed in the background.
     */
    const setAnalyzer = (analyzer: AnalyzerInterface | null): void => {
        if (analyzer === currentAnalyzer.value) {
            return;
        }

        currentAnalyzer.value?.persistCache?.();
        currentAnalyzer.value = analyzer;

        evalsByNodeId.value = new Map();
        whiteWin.value = undefined;

        void updateAnalysis();
        void fillAncestorEvals(tree.getPath(currentNodeId.value));
    };

    /**
     * Rebuilds the visible board by replaying the path from root to the given node:
     * 'move' nodes are fed into a PlayingGameFacade (alternating, swap-aware) per segment,
     * 'setup' nodes are applied directly onto the view, starting a new segment after them.
     * Synchronous (no network calls): the board updates instantly. Evaluation of the path
     * is then filled in the background (fillAncestorEvals + updateAnalysis), without blocking.
     */
    const goToNode = (id: number): void => {
        const path = tree.getPath(id);

        playingGameFacade?.destroy();
        clearBoard();
        marksLayer.clear();

        let pgf = new PlayingGameFacade(gameView, true, [], false);

        for (const node of path) {
            if (node.data !== null) {
                if (node.data.type === 'setup') {
                    clearBoard();
                    applySetupStones(node.data.stones);
                    pgf.destroy();
                    pgf = new PlayingGameFacade(gameView, false, [], false, node.data.nextPlayer);
                } else {
                    pgf.addMove(node.data.move);
                }
            }
        }

        // Marks are positional annotations, shown only for the exact node they belong to.
        const lastNode = path[path.length - 1];

        if (lastNode?.data?.type === 'setup') {
            for (const mark of lastNode.data.marks) {
                if (mark.type === 'select') {
                    marksLayer.setSelected(mark.move, true);
                } else {
                    marksLayer.setMark(mark.move, mark.type, mark.text);
                }
            }
        }

        playingGameFacade = pgf;
        setCurrentNode(id);
        state.value.currentPlayer = playingGameFacade.getCurrentPlayerIndex();

        void updateAnalysis();
        void fillAncestorEvals(path);
    };

    // Back/forward are manual navigation, so (like history/eval clicks) they stop auto-play.
    // Otherwise stepping back would immediately be replayed by the auto-player.
    const goToParent = (): void => {
        const node = tree.getNode(currentNodeId.value);

        if (node.parentId !== null) {
            userGoToNode(node.parentId);
        }
    };

    const goToFirstChild = (): void => {
        const node = tree.getNode(currentNodeId.value);

        if (node.children.length > 0) {
            userGoToNode(node.children[0]);
        }
    };

    /**
     * Whether the currently displayed node can be deleted (the root cannot).
     */
    const canDeleteCurrentNode = computed<boolean>(() => tree.getNode(currentNodeId.value).parentId !== null);

    /**
     * Deletes the currently displayed node and all its descendants, then goes to its parent.
     */
    const deleteCurrentNode = (): void => {
        const node = tree.getNode(currentNodeId.value);

        if (node.parentId === null) {
            return;
        }

        const { parentId } = node;

        tree.removeNode(node.id);

        for (const id of [...evalsByNodeId.value.keys()]) {
            if (!tree.nodes.value.some(n => n.id === id)) {
                evalsByNodeId.value.delete(id);
            }
        }

        goToNode(parentId);
    };

    const disableAutoPlay = (): void => {
        state.value.autoPlay = [false, false];
    };

    /**
     * Navigates to a node from a manual user action (history tree click), which also
     * stops auto-play so the engine doesn't immediately resume from the picked position.
     */
    const userGoToNode = (id: number): void => {
        disableAutoPlay();
        goToNode(id);
    };

    /**
     * Goes to the board position at the given ply index in evalHistory
     * (i.e position of a bar clicked in the evaluation graph).
     * Also stops auto-play, like any manual navigation.
     */
    const goToEvalIndex = (index: number): void => {
        if (state.value.setupMode) {
            return;
        }

        const node = currentLine.value[index];

        if (node) {
            userGoToNode(node.id);
        }
    };

    /**
     * Plays a move from the current position: reuses an already explored
     * child with the same move if any, otherwise creates a new branch.
     * Synchronous: appends directly onto the live facade instead of replaying
     * the whole path, so the board updates instantly and a second rapid click
     * is never racing a still-pending navigation.
     */
    const playMove = (move: HexMove): void => {
        const guessed = playingGameFacade.guessMove(move);
        const existing = tree.findChildByMove(currentNodeId.value, guessed);

        // Already explored this move from here: cell is guaranteed empty at this position, safe to replay.
        if (existing) {
            playingGameFacade.addMove(guessed);
            setCurrentNode(existing.id);
            state.value.currentPlayer = playingGameFacade.getCurrentPlayerIndex();

            void updateAnalysis();
            return;
        }

        // New move: only create a tree node if it actually gets played
        // (addMove returns false, without doing anything, if the cell is already occupied).
        if (!playingGameFacade.addMove(guessed)) {
            return;
        }

        const node = tree.addMove(currentNodeId.value, guessed);

        setCurrentNode(node.id);
        state.value.currentPlayer = playingGameFacade.getCurrentPlayerIndex();

        void updateAnalysis();
    };

    /**
     * Plays a pass move for the player to move (skips the turn).
     */
    const pass = (): void => {
        if (state.value.setupMode) {
            return;
        }

        playMove('pass');
    };

    // Guards against several auto-play passes racing each other (e.g rapid state changes).
    let autoPlayRunning = false;

    /**
     * If auto-play is enabled for the color to move, asks the analyzer for its recommended
     * move and plays it. Playing changes the turn, which re-triggers this via the watcher
     * below, so two auto-play colors play each other out until the game ends or is disabled.
     */
    const maybeAutoPlay = async (): Promise<void> => {
        if (autoPlayRunning) {
            return;
        }

        const analyzer = currentAnalyzer.value;
        const player = state.value.currentPlayer;

        if (!analyzer || state.value.setupMode || !state.value.autoPlay[player]) {
            return;
        }

        if (buildGameAt(currentNodeId.value).hasWinner()) {
            return;
        }

        const nodeId = currentNodeId.value;
        const { black, white } = getBoardStones(gameView);
        const color = player === 0 ? 'black' : 'white';
        const size = gameView.getBoardsize();

        autoPlayRunning = true;

        let move: null | HexMove = null;

        try {
            move = (await analyzer.analyzePosition({ size, color, black, white })).recommendedMove ?? null;
        } finally {
            autoPlayRunning = false;
        }

        // Discard if the position or settings changed while we were computing the move.
        if (
            move === null
            || nodeId !== currentNodeId.value
            || player !== state.value.currentPlayer
            || state.value.setupMode
            || !state.value.autoPlay[player]
        ) {
            return;
        }

        playMove(move);
    };

    // Re-evaluate auto-play whenever the position, the color to move, or the settings change.
    watch(
        [currentNodeId, () => state.value.currentPlayer, () => state.value.setupMode, () => state.value.autoPlay],
        () => void maybeAutoPlay(),
        { deep: true },
    );

    // Toggling winrate/policy display for a color re-runs analysis for the current position.
    watch(
        [() => state.value.winrateEnabled, () => state.value.policyEnabled],
        () => void updateAnalysis(),
        { deep: true },
    );

    // Toggling policy display options just re-renders the cached overlay, no new analysis needed.
    watch(
        [() => state.value.policyShowNumbers, () => state.value.policyShowBestMark],
        () => {
            policyOverlayFacade.setShowNumbers(state.value.policyShowNumbers);
            policyOverlayFacade.setShowBestMark(state.value.policyShowBestMark);
            policyOverlayFacade.reapply();
        },
    );

    // Sync URL hash with the current position so sharing the URL restores the position.
    // Format: "{size}c1,{moves_to_cursor},{continuation}" where continuation is the
    // remaining moves in the current evaluation line (so the tree is preserved on reload).
    watch(currentNodeId, () => {
        const size = gameViewRef.value?.getBoardsize() ?? 11;

        const movesStr = (nodes: TreeNode[]): string =>
            nodes
                .filter(node => node.data?.type === 'move')
                .map(node => {
                    const move = (node.data as { type: 'move', move: HexMove }).move;
                    if (move === 'swap-pieces') return ':s';
                    if (move === 'pass') return ':p';
                    return move;
                })
                .join('');

        const line = currentLine.value; // root → lineLeaf
        const cursorIndex = line.findIndex(node => node.id === currentNodeId.value);
        const before = cursorIndex >= 0 ? line.slice(0, cursorIndex + 1) : line;
        const after = cursorIndex >= 0 ? line.slice(cursorIndex + 1) : [];

        const movesBefore = movesStr(before);
        const movesAfter = movesStr(after);
        const hash = movesAfter
            ? `${size}c1,${movesBefore},${movesAfter}`
            : `${size}c1,${movesBefore}`;

        window.history.replaceState(null, '', `#${hash}`);
    });

    const goSetupMode = (): void => {
        state.value.setupMode = true;
        currentTool.value = createAlternatingTool();
    };

    /**
     * Commits the stones currently on the board (scratch setup edits) as a single tree node,
     * and exits setup mode. Normal alternating play resumes from this node.
     */
    const validateSetup = (): void => {
        const { black, white } = getBoardStones(gameView);

        const stones: SetupStone[] = [
            ...black.map(move => ({ move, color: 0 as const })),
            ...white.map(move => ({ move, color: 1 as const })),
        ];

        const marks = marksLayer.getAll();

        const node = tree.addSetup(currentNodeId.value, stones, state.value.currentPlayer, marks);

        state.value.setupMode = false;
        actionsStack.value = new UndoableActionsStack();

        goToNode(node.id);
    };

    /**
     * Discards scratch setup edits and exits setup mode, without creating a tree node.
     */
    const cancelSetup = (): void => {
        state.value.setupMode = false;
        actionsStack.value = new UndoableActionsStack();

        goToNode(currentNodeId.value);
    };

    /**
     * Wire up event listeners and helpers on freshly created game instances.
     * Must be called each time the board is rebuilt.
     */
    const setupGameInstances = (gv: GameView, pgf: PlayingGameFacade) => {
        gameView = gv;
        playingGameFacade = pgf;
        gameViewRef.value = gv;
        state.value.boardsize = gv.getBoardsize();
        marksLayer = new BoardMarksLayer(gameView);

        new PlayerSettingsFacade(gameView);

        gameView.on('hexPointerDown', async move => {
            if (!state.value.setupMode) return;

            const tool = currentTool.value;

            if (!tool.getDragMode) return;

            const mode = tool.getDragMode(move);

            if (mode === null) return;

            isDragPainting = true;
            dragMode = mode;
            dragCellActions.clear();

            const action = tool.createDragAction!(move, mode);

            if (action) {
                await action.do();
                dragCellActions.set(move, action);
            }
        });

        gameView.on('hexHovered', async move => {
            if (!isDragPainting || dragMode === null) return;
            if (dragCellActions.has(move)) return;

            const tool = currentTool.value;

            if (!tool.createDragAction) return;

            const action = tool.createDragAction(move, dragMode);

            if (!action) return;

            await action.do();
            dragCellActions.set(move, action);
        });

        gameView.on('hexClicked', async move => {
            if (state.value.setupMode) {
                // Drag-capable tools already handled this cell on pointerdown, and the whole
                // drag (even a single-cell one) is committed on pointerup by endDragPainting.
                // Acting on the click too would apply the tool twice on the same cell.
                if (currentTool.value.getDragMode) {
                    return;
                }

                const action = currentTool.value.createUndoableAction(move);
                if (action !== null) {
                    await actionsStack.value.pushAndDo(action);
                    await updateAnalysis();
                }
            } else {
                playMove(move);
            }
        });

        policyOverlayFacade = new PolicyOverlayFacade(gameView);
    };

    /**
     * Destroys current game instances and creates a fresh empty board of the given size,
     * resetting the whole tree back to its root.
     */
    const rebuildBoard = async (boardsize: number): Promise<void> => {
        isDragPainting = false;
        dragMode = null;
        dragCellActions.clear();

        playingGameFacade?.destroy();
        gameView?.destroy();

        const newGV = new GameView(boardsize);
        const newPGF = new PlayingGameFacade(newGV, true, [], false);

        setupGameInstances(newGV, newPGF);
        currentTool.value = createAlternatingTool();

        state.value.setupMode = false;
        state.value.currentPlayer = 0;

        tree.reset();
        setCurrentNode(ROOT_ID);
        evalsByNodeId.value = new Map();
        actionsStack.value = new UndoableActionsStack();

        if (mountedElement) {
            await gameView.mount(mountedElement);
        }
    };

    /**
     * Adds a straight chain of move nodes from root, returning the ids of all added nodes
     * (index 0 = ROOT_ID, index 1 = first move, …, index n = last move).
     */
    const addMoveChain = (moves: HexMove[]): number[] => {
        const ids: number[] = [ROOT_ID];
        let parentId = ROOT_ID;

        for (const move of moves) {
            parentId = tree.addMove(parentId, move).id;
            ids.push(parentId);
        }

        return ids;
    };

    // Initial setup from URL hash
    const { gameView: initGV, playingGameFacade: initPGF, moves: initMoves, cursorMoveCount: initCursorMoveCount } = initGameViewFromUrlHash(fromHash);
    setupGameInstances(initGV, initPGF);
    currentTool.value = createAlternatingTool();
    const initNodeIds = addMoveChain(initMoves);
    goToNode(initNodeIds[initCursorMoveCount ?? initNodeIds.length - 1] ?? ROOT_ID);

    /**
     * Mount the current game view to a DOM element.
     * Stores the element so future board rebuilds can remount automatically.
     */
    const mount = async (element: HTMLElement): Promise<void> => {
        mountedElement = element;
        await gameView.mount(element);
    };

    /**
     * Import a game, starting fresh: the previous tree is discarded.
     */
    const importGame = async (importedGame: ImportedGame): Promise<void> => {
        const { boardsize, moves, playerBlackName, playerWhiteName } = importedGame;

        await rebuildBoard(boardsize);

        state.value.playerBlackName = playerBlackName;
        state.value.playerWhiteName = playerWhiteName;

        const nodeIds = addMoveChain(moves);
        goToNode(nodeIds[nodeIds.length - 1] ?? ROOT_ID);
    };

    /**
     * Resets to an empty board, for starting a fresh analysis. The previous tree is discarded.
     */
    const resetState = async (boardsize: number = gameView.getBoardsize()): Promise<void> => {
        await rebuildBoard(boardsize);

        state.value.playerBlackName = undefined;
        state.value.playerWhiteName = undefined;

        goToNode(ROOT_ID);
    };

    const undo = async () => {
        if (state.value.setupMode) {
            await actionsStack.value.undo();
            await updateAnalysis();
        } else {
            goToParent();
        }
    };

    const redo = async () => {
        if (state.value.setupMode) {
            await actionsStack.value.redo();
            await updateAnalysis();
        } else {
            goToFirstChild();
        }
    };

    /**
     * Downloads the whole explored analysis tree (all branches) as a .sgf file.
     */
    const exportSgf = (): void => {
        const sgf = gameTreeToSgf(tree, gameView.getBoardsize(), state.value.playerBlackName, state.value.playerWhiteName);

        downloadString(sgfToString(sgf), 'hexplorer.sgf', 'application/x-go-sgf');
    };

    /**
     * Downloads the whole state (board size, move tree, current position and settings)
     * as a JSON file that importAnalysis() can restore.
     */
    const exportAnalysis = (): void => {
        downloadString(JSON.stringify(state.value), 'hexplorer.json', 'application/json');
    };

    /**
     * Restores a state previously saved with exportAnalysis(). Throws on malformed input.
     */
    const importAnalysis = async (json: string): Promise<void> => {
        const restored = JSON.parse(json) as Partial<HexplorerState>;

        if (typeof restored.boardsize !== 'number' || typeof restored.currentNodeId !== 'number' || !Array.isArray(restored.nodes)) {
            throw new Error('Invalid Hexplorer analysis file.');
        }

        await rebuildBoard(restored.boardsize);

        state.value = restored as HexplorerState;
        state.value.setupMode = false;
        tree.reload(); // node list now comes from the restored state; refresh the id counter

        const targetId = tree.nodes.value.some(node => node.id === state.value.currentNodeId)
            ? state.value.currentNodeId
            : ROOT_ID;

        goToNode(targetId);
    };

    const bindKeys = () => {
        // ctrl+Z/Y
        onKeyDown(
            e => (e.ctrlKey || e.metaKey) && e.key === 'z',
            e => {
                e.preventDefault();
                void undo();
            },
        );

        onKeyDown(
            e => (e.ctrlKey || e.metaKey) && e.key === 'y',
            e => {
                e.preventDefault();
                void redo();
            },
        );

        // left/right
        onKeyDown(
            'ArrowLeft',
            e => {
                e.preventDefault();
                void undo();
            },
        );

        onKeyDown(
            'ArrowRight',
            e => {
                e.preventDefault();
                void redo();
            },
        );
    };

    return {
        gameView: gameViewRef,
        tree,
        currentNodeId,
        actionsStack,
        state,
        whiteWin,
        analysisLoading,
        currentTool,
        evalHistory,
        evalCursorIndex,
        goToEvalIndex,
        goToNode,
        userGoToNode,
        goToParent,
        goToFirstChild,
        pass,
        canDeleteCurrentNode,
        deleteCurrentNode,
        updateAnalysis,
        goSetupMode,
        validateSetup,
        cancelSetup,
        bindKeys,
        mount,
        importGame,
        resetState,
        createAlternatingTool,
        createRemoveStoneTool,
        createMarkTool,
        exportSgf,
        exportAnalysis,
        importAnalysis,
        currentAnalyzer,
        setAnalyzer,
    };
};

const initGameViewFromUrlHash = (hash?: string): { gameView: GameView, playingGameFacade: PlayingGameFacade, moves: HexMove[], cursorMoveCount?: number } => {
    if (!hash || hash.length <= 1) {
        const gameView = new GameView(11);
        const playingGameFacade = new PlayingGameFacade(gameView, true, [], false);

        return { gameView, playingGameFacade, moves: [] };
    }

    let size = 11;
    let moves: HexMove[] = [];
    let cursorMoveCount: number | undefined;

    try {
        const parsed = parseHexworldString(hash.substring(1));
        size = parsed.size;
        moves = parsed.moves as HexMove[];
        cursorMoveCount = parsed.cursorMoveCount;
    } catch {
        // invalid hash, ignore and do not crash
    }

    const gameView = new GameView(size);
    const playingGameFacade = new PlayingGameFacade(gameView, true, [], false);

    return { gameView, playingGameFacade, moves, cursorMoveCount };
};
