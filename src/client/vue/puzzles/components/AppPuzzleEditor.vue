<script setup lang="ts">
import { type Component, computed, ref, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { defineOverlay } from '@overlastic/vue';
import { useElementSize, useWindowFocus, whenever } from '@vueuse/core';
import { t } from 'i18next';
import { Game, Puzzle, PuzzleCollection } from '../../../../shared/app/models/index.js';
import { isElseNode, PUZZLE_DESCRIPTION_MAX_LENGTH, PUZZLE_MESSAGE_MAX_LENGTH, PUZZLE_TITLE_MAX_LENGTH } from '../../../../shared/app/puzzles/puzzleTree.js';
import { isValidBoardsize, MAX_BOARDSIZE, MIN_BOARDSIZE, MOHEX_MAX_BOARDSIZE } from '../../../../shared/app/boardsizeLimits.js';
import { apiDeletePuzzle, apiGetMyPuzzleCollections, apiPostPuzzle, apiPutPuzzle } from '../../../apiClient.js';
import { type EditorStep, usePuzzleEditor } from '../composables/usePuzzleEditor.js';
import AppPuzzleTreeNode from './AppPuzzleTreeNode.vue';
import AppPuzzleEdgeConnectionTool from './AppPuzzleEdgeConnectionTool.vue';
import { translatePuzzleError } from '../services/puzzleErrorMessage.js';
import PuzzleEditorExpertModeOverlay from './PuzzleEditorExpertModeOverlay.vue';
import ImportGameOverlay from '../../components/overlay/ImportGameOverlay.vue';
import { IconArrowBarLeft, IconArrowBarRight, IconArrowLeft, IconArrowReturnRight, IconAspectRatio, IconAsterisk, IconCheck, IconChevronBarLeft, IconChevronBarRight, IconChevronLeft, IconChevronRight, IconCircleFill, IconDiagram2, IconEraser, IconExclamationTriangle, IconEye, IconHexagonFill, IconInfoCircle, IconMagic, IconPlayFill, IconRobot, IconSave2, IconSendFill, IconShuffle, IconSignpostSplit, IconTrash, IconXLg, IconZoomIn, IconZoomOut } from '../../icons.js';
import { apiErrorMessage } from '../../../services/apiErrorMessage.js';
import usePlayerLocalSettingsStore from '../../../stores/playerLocalSettingsStore.js';
import { createKatahexAnalyzers, useAnalysisEngines } from '../../hexplorer/composables/useAnalysisEngines.js';
import type { PuzzleCheckEngine } from '../../../../shared/app/puzzles/puzzleCheck.js';

const props = defineProps<{
    /**
     * Puzzle to edit, or null to create a new one.
     */
    puzzle: null | Puzzle;

    /**
     * Game to create puzzle from.
     */
    sourceGame: null | Game;

    /**
     * Collection to put created puzzle in.
     */
    collectionPublicId?: null | string;

    /**
     * Puzzle to copy when creating a new one.
     */
    clonedPuzzle: null | Puzzle;
}>();

const {
    mount,
    forcedOrientation,
    forcedShowCoords,
    step,
    setStep,
    title,
    description,
    collectionPublicId,
    published,
    boardsize,
    setBoardsize,
    playerColor,
    setPlayerColor,
    firstColor,
    computerPlaysFirst,
    canSetComputerPlaysFirst,
    setComputerPlaysFirst,
    alternativesEnabled,
    alternativesUsed,
    alternativesCount,
    setAlternativesEnabled,
    lastMove,
    clearLastMove,
    positionTool,
    positionSource,
    gamePublicId,
    importPosition,
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
    selectedHasChildren,
    deleteChildren,
    boardError,
    transpositions,
    selectedTransposition,
    goToTransposition,
    transpositionNotice,
    errors,
    draftErrors,
    nodeErrors,
    selectErrorNode,
    puzzleCheck,
    puzzleCheckError,
    puzzleChecking,
    runPuzzleCheck,
    redStones,
    blueStones,
    disabledCells,
    edgeToolError,
    canEditEdgeConnections,
    impossibleEdgeConnections,
    solverFillPreview,
    toggleSolverFillPreview,
    hideDisabledCells,
    toInput,
    analyzer,
    setAnalyzer,
    solverEnabled,
    solverResult,
    enableSolver,
    analysisLoading,
    analysisError,
} = usePuzzleEditor(props.puzzle, props.sourceGame, props.collectionPublicId ?? null, props.clonedPuzzle);

/**
 * Game the puzzle is taken from, shown as "from this game".
 * Can only be set when creating puzzle.
 */
const linkedGamePublicId = computed(() => props.puzzle === null ? gamePublicId.value : props.puzzle.game?.publicId ?? null);

const gameViewElement = useTemplateRef('game-view-element');

whenever(gameViewElement, async element => {
    await mount(element);
}, {
    once: true,
});

const sidebarOpen = ref(true);

/*
 * Panels, listed in sidebar nav. Nav can be collapsed to show icons only.
 */

/**
 * bottom: shown at bottom of nav, must be last.
 */
const panels: { step: EditorStep, icon: Component, labelKey: string, bottom?: true }[] = [
    { step: 'position', icon: IconHexagonFill, labelKey: 'puzzles.editor.initial_position' },
    { step: 'tree', icon: IconDiagram2, labelKey: 'puzzles.editor.tree' },
    { step: 'engines', icon: IconRobot, labelKey: 'puzzles.editor.engines_tab' },
    { step: 'info', icon: IconInfoCircle, labelKey: 'puzzles.editor.info_tab' },
    { step: 'publish', icon: IconSendFill, labelKey: 'puzzles.editor.publish_tab' },
    { step: 'display', icon: IconAspectRatio, labelKey: 'puzzles.editor.display_tab', bottom: true },
];

/**
 * Collapsed by default on medium screens, to keep room for the board.
 */
const navCollapsed = ref(window.innerWidth < 992);

/**
 * Collapse button is as high as save footer, to be aligned with it.
 */
const footerElement = useTemplateRef('footer-element');
const { height: footerHeight } = useElementSize(footerElement, undefined, { box: 'border-box' });

/*
 * Sidebar resize, by dragging handle on its left edge. Not on mobile, where sidebar is full width.
 * Width is clamped in css, from default sidebar width to 3/4 of layout.
 */

const layoutElement = useTemplateRef('layout-element');

/**
 * Width in px, null for default width.
 */
const sidebarWidth = ref<null | number>(null);

let resizing = false;

const startResize = (e: PointerEvent): void => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizing = true;
};

const resize = (e: PointerEvent): void => {
    if (!resizing || layoutElement.value === null) {
        return;
    }

    sidebarWidth.value = layoutElement.value.getBoundingClientRect().right - e.clientX;
};

const stopResize = (): void => {
    resizing = false;
};

/**
 * Collections of author, to put puzzle in one.
 * Reloaded when coming back from another tab, where a collection may have been created.
 */
const collections = ref<PuzzleCollection[]>([]);

const loadCollections = async (): Promise<void> => {
    try {
        collections.value = await apiGetMyPuzzleCollections();
    } catch (e) {
        // Not essential, puzzle can still be saved without changing its collection
        console.error('Could not load collections', e);
        return;
    }

    // Selected collection may have been deleted from another tab
    if (!collections.value.some(collection => collection.publicId === collectionPublicId.value)) {
        collectionPublicId.value = null;
    }
};

void loadCollections();
whenever(useWindowFocus(), loadCollections);

const newBoardsize = ref(boardsize.value);

const isEmpty = (): boolean => redStones.value.length + blueStones.value.length + disabledCells.value.length === 0 && !tree.value.children?.length;

const applyBoardsize = async (): Promise<void> => {
    if (!isEmpty() && !confirm(t('puzzles.editor.boardsize_confirm'))) {
        return;
    }

    await setBoardsize(newBoardsize.value);
};

/*
 * Import position from any source (link, SGF, move list...)
 */

const importGameOverlay = defineOverlay(ImportGameOverlay);

const openImportOverlay = async (): Promise<void> => {
    if (!isEmpty() && !confirm(t('puzzles.editor.import_confirm'))) {
        return;
    }

    try {
        await importGameOverlay({
            titleKey: 'puzzles.editor.import_position',
            onImport: async importedGame => {
                await importPosition(importedGame);
                newBoardsize.value = boardsize.value;
            },
        });
    } catch {
        // dismissed
    }
};

/*
 * Simple / expert mode
 */

const { localSettings } = storeToRefs(usePlayerLocalSettingsStore());

/**
 * Expert mode shows advanced features: "else" node, parallel sequences, tree zoom.
 * Simple mode by default, saved on this device.
 */
const expertMode = computed(() => localSettings.value.puzzleEditorExpertMode ?? false);

const openExpertModeOverlay = defineOverlay(PuzzleEditorExpertModeOverlay);

const setExpertMode = async (enabled: boolean): Promise<void> => {
    localSettings.value.puzzleEditorExpertMode = enabled;

    if (!enabled) {
        return;
    }

    try {
        await openExpertModeOverlay();
    } catch {
        // dismissed
    }
};

/**
 * Smaller tree, without coordinates, to see the whole structure of large trees.
 * Expert mode only.
 */
const treeZoomedOut = ref(false);

/*
 * AI eval, expert mode only
 */

const analyzers = createKatahexAnalyzers();

/**
 * Value of AI eval select for Mohex solver.
 */
const SOLVER_INDEX = -2;

/**
 * Index of selected engine in analyzers, -1 for none, SOLVER_INDEX for Mohex solver.
 */
const selectedAnalyzerIndex = computed({
    get: () => solverEnabled.value ? SOLVER_INDEX : analyzers.findIndex(a => a === analyzer.value),
    set: index => index === SOLVER_INDEX ? enableSolver() : setAnalyzer(analyzers[index] ?? null),
});

const { aiAvailability, isAnalyzerAvailable } = useAnalysisEngines(analysisError);

const isAnalyzerUnavailable = computed(() => analysisError.value === 'engine_unavailable'
    || (analyzer.value !== null && !isAnalyzerAvailable(analyzer.value))
    || (solverEnabled.value && aiAvailability.value?.solverAvailable === false));

watch(expertMode, enabled => {
    if (!enabled) {
        setAnalyzer(null);
    }
});

/*
 * Puzzle check with katahex or Mohex solver, in engines tab
 */

const puzzleCheckEngine = ref<PuzzleCheckEngine>('katahex-intuition');

/**
 * Mohex solver proves positions, unlike katahex. Unknown availability is considered available.
 */
const isSolverAvailable = computed(() => aiAvailability.value?.solverAvailable !== false
    && boardsize.value <= MOHEX_MAX_BOARDSIZE);

/**
 * Translation key of a check message depending on engine, e.g "puzzles.editor.solver_check_ok".
 */
const checkKey = (engine: PuzzleCheckEngine, suffix: '' | '_help' | '_progress' | '_ok' | '_warnings'): string =>
    `puzzles.editor.${engine === 'mohex-solver' ? 'solver' : 'katahex'}_check${suffix}`;

/**
 * Warnings of last check, 0 if not checked. Check is reset when puzzle changes.
 */
const checkWarningsCount = computed(() => puzzleCheck.value?.status === 'done' ? puzzleCheck.value.warnings.length : 0);

const puzzleCheckProgress = computed(() => puzzleCheck.value === null || puzzleCheck.value.total === 0
    ? 0
    : Math.round(100 * puzzleCheck.value.done / puzzleCheck.value.total),
);

/*
 * Nav badges: publish errors, check warnings.
 */

type PanelBadge = { count: number, variant: 'danger' | 'warning', titleKey: string };

const getPanelBadge = (panelStep: EditorStep): null | PanelBadge => {
    if (panelStep === 'publish' && errors.value.length > 0) {
        return { count: errors.value.length, variant: 'danger', titleKey: 'puzzles.editor.errors_badge' };
    }

    if (panelStep === 'engines' && checkWarningsCount.value > 0) {
        return { count: checkWarningsCount.value, variant: 'warning', titleKey: 'puzzles.editor.warnings_badge' };
    }

    return null;
};

const navPanels = computed(() => panels.map(panel => ({ ...panel, badge: getPanelBadge(panel.step) })));

/**
 * Title and aria label when nav is collapsed, badge is only a dot then.
 * Not in computed, to be translated again when language changes.
 */
const collapsedLabel = ({ labelKey, badge }: typeof navPanels.value[number]): string => badge === null
    ? t(labelKey)
    : `${t(labelKey)} (${t(badge.titleKey, { count: badge.count })})`;

const changeElseAnswer = (): void => {
    selectParent();
    startPickingElse();
};

/*
 * Save
 */

const router = useRouter();
const saving = ref(false);
const saveError = ref<null | string>(null);

/**
 * Runs an api call, and shows its error if it fails.
 */
const withSaving = async (callback: () => Promise<void>): Promise<void> => {
    saving.value = true;
    saveError.value = null;

    try {
        await callback();
    } catch (e) {
        saveError.value = apiErrorMessage(e);
    } finally {
        saving.value = false;
    }
};

/**
 * Public id of saved puzzle, null until a new puzzle is saved once.
 */
const savedPublicId = ref<null | string>(props.puzzle?.publicId ?? null);

/**
 * Shows saved feedback on save button for a moment, when staying on editor.
 */
const justSaved = ref(false);
let justSavedTimeout: undefined | ReturnType<typeof setTimeout>;

/**
 * @param publish Whether puzzle is published after saving, keeps current state by default
 * @param stay Whether to stay on editor, else go to puzzle page to test it
 */
const save = ({ publish = published, stay = false } = {}): Promise<void> => withSaving(async () => {
    const saved = savedPublicId.value === null
        ? await apiPostPuzzle(toInput(publish))
        : await apiPutPuzzle(savedPublicId.value, toInput(publish))
    ;

    if (!stay) {
        await router.push({ name: 'puzzle', params: { publicId: saved.publicId } });
        return;
    }

    // New puzzle: next saves update it. Only change url, navigating would reload editor.
    if (savedPublicId.value === null) {
        savedPublicId.value = saved.publicId;
        history.replaceState(history.state, '', router.resolve({ name: 'puzzle-edit', params: { publicId: saved.publicId } }).href);
    }

    justSaved.value = true;
    clearTimeout(justSavedTimeout);
    justSavedTimeout = setTimeout(() => justSaved.value = false, 2000);
});

const statusKey = published ? 'puzzles.published' : 'puzzles.draft';

/**
 * Published puzzle must stay valid, draft can be incomplete.
 */
const canSave = computed(() => (published ? errors : draftErrors).value.length === 0);

const deletePuzzle = async (): Promise<void> => {
    const publicId = savedPublicId.value;

    if (publicId === null || !confirm(t('puzzles.editor.delete_confirm'))) {
        return;
    }

    await withSaving(async () => {
        await apiDeletePuzzle(publicId);
        await router.push({ name: 'puzzles-mine' });
    });
};
</script>

<template>
    <div ref="layout-element" class="puzzle-layout row g-0 flex-nowrap position-relative bg-body">
        <div class="col d-flex flex-column h-100 overflow-hidden">
            <div ref="game-view-element" class="flex-grow-1 overflow-hidden"></div>

            <!-- Min height: keeps bar height when no button, so board does not resize when changing panel -->
            <div class="board-bar d-flex flex-wrap justify-content-center align-items-center gap-1 position-relative py-1 px-5">
                <!-- Rewind source game -->
                <div v-if="'position' === step && positionSource" class="btn-group">
                    <button class="btn btn-outline-primary" @click="setSourceGameMovesCount(0)" :aria-label="$t('puzzles.editor.first_move')"><IconChevronBarLeft /></button>
                    <button class="btn btn-outline-primary" @click="setSourceGameMovesCount(sourceGameMovesCount - 1)" :aria-label="$t('puzzles.editor.previous_move')"><IconChevronLeft /></button>
                    <span class="btn btn-outline-primary disabled text-body">{{ sourceGameMovesCount }} / {{ positionSource.moves.length }}</span>
                    <button class="btn btn-outline-primary" @click="setSourceGameMovesCount(sourceGameMovesCount + 1)" :aria-label="$t('puzzles.editor.next_move')"><IconChevronRight /></button>
                    <button class="btn btn-outline-primary" @click="setSourceGameMovesCount(positionSource.moves.length)" :aria-label="$t('puzzles.editor.last_move')"><IconChevronBarRight /></button>
                </div>

                <button
                    v-if="'tree' === step"
                    class="btn btn-outline-primary"
                    :disabled="selectedPath.length === 0"
                    @click="selectParent()"
                ><IconArrowLeft /> {{ $t('puzzles.editor.parent') }}</button>

                <button
                    type="button"
                    class="btn btn-outline-primary position-absolute end-0 top-50 translate-middle-y me-2"
                    :aria-label="sidebarOpen ? $t('puzzles.editor.hide_sidebar') : $t('puzzles.editor.show_sidebar')"
                    :title="sidebarOpen ? $t('puzzles.editor.hide_sidebar') : $t('puzzles.editor.show_sidebar')"
                    :aria-expanded="sidebarOpen"
                    @click="sidebarOpen = !sidebarOpen"
                >
                    <IconArrowBarLeft v-if="!sidebarOpen" />
                    <IconArrowBarRight v-else />
                </button>
            </div>
        </div>

        <div
            v-if="sidebarOpen"
            class="puzzle-sidebar col-12 d-flex h-100 border-start bg-body-tertiary"
            :class="{ resized: sidebarWidth !== null, 'nav-collapsed': navCollapsed }"
            :style="sidebarWidth === null ? undefined : { '--sidebar-width': `${sidebarWidth}px` }"
        >
            <div
                class="sidebar-resize-handle d-none d-sm-block"
                role="separator"
                aria-orientation="vertical"
                @pointerdown.prevent="startResize"
                @pointermove="resize"
                @pointerup="stopResize"
                @pointercancel="stopResize"
            ></div>

            <nav class="puzzle-nav d-flex flex-column flex-shrink-0 border-end">
                <!-- Opens publish tab -->
                <button
                    type="button"
                    class="puzzle-status border-0 small fw-semibold"
                    :class="published ? 'text-bg-success' : 'text-bg-warning'"
                    :title="navCollapsed ? $t(statusKey) : undefined"
                    :aria-label="navCollapsed ? $t(statusKey) : undefined"
                    @click="setStep('publish')"
                >{{ navCollapsed ? '' : $t(statusKey) }}</button>

                <template v-if="!navCollapsed">
                    <div class="puzzle-nav-title small fw-semibold text-truncate px-3 pt-2" :title="title || undefined">{{ title || $t('puzzles.editor.new_puzzle') }}</div>

                    <div class="form-check form-switch small mx-3 my-2">
                        <input
                            id="puzzle-expert-mode"
                            class="form-check-input"
                            type="checkbox"
                            role="switch"
                            :checked="expertMode"
                            @change="e => setExpertMode((e.target as HTMLInputElement).checked)"
                        >
                        <label class="form-check-label text-truncate d-block" for="puzzle-expert-mode">{{ $t('puzzles.editor.expert_mode') }}</label>
                    </div>
                </template>

                <div class="mb-4"></div>

                <button
                    v-for="panel in navPanels"
                    :key="panel.step"
                    type="button"
                    class="puzzle-nav-item"
                    :class="{ active: panel.step === step, 'mt-auto': panel.bottom }"
                    :title="navCollapsed ? collapsedLabel(panel) : undefined"
                    :aria-label="navCollapsed ? collapsedLabel(panel) : undefined"
                    :aria-current="panel.step === step ? 'page' : undefined"
                    @click="setStep(panel.step)"
                >
                    <span class="position-relative">
                        <component :is="panel.icon" />

                        <!-- Dot on icon when collapsed, count in label -->
                        <span v-if="navCollapsed && panel.badge" class="nav-icon-badge" :class="`bg-${panel.badge.variant}`"></span>
                    </span>

                    <template v-if="!navCollapsed">
                        <span class="flex-grow-1 text-truncate">{{ $t(panel.labelKey) }}</span>

                        <span
                            v-if="panel.badge"
                            class="badge rounded-pill"
                            :class="`text-bg-${panel.badge.variant}`"
                            :title="$t(panel.badge.titleKey, { count: panel.badge.count })"
                        >{{ panel.badge.count }}</span>
                    </template>
                </button>

                <button
                    type="button"
                    class="puzzle-nav-item text-body-secondary"
                    :style="{ minHeight: `${footerHeight}px` }"
                    :title="navCollapsed ? $t('puzzles.editor.expand_nav') : undefined"
                    :aria-label="navCollapsed ? $t('puzzles.editor.expand_nav') : undefined"
                    :aria-expanded="!navCollapsed"
                    @click="navCollapsed = !navCollapsed"
                >
                    <IconChevronBarRight v-if="navCollapsed" />
                    <template v-else><IconChevronBarLeft /> <span class="text-truncate">{{ $t('puzzles.editor.collapse_nav') }}</span></template>
                </button>
            </nav>

            <div class="puzzle-panel d-flex flex-column flex-grow-1 h-100">
                <div class="flex-grow-1 overflow-auto p-3" :class="{ 'd-flex flex-column': 'tree' === step }">
                    <!-- Position -->
                    <template v-if="'position' === step">
                        <p v-if="linkedGamePublicId" class="small">
                            <router-link :to="{ name: 'online-game', params: { gameId: linkedGamePublicId } }" target="_blank">{{ $t('puzzles.from_game') }}</router-link>
                        </p>

                        <div class="mb-3">
                            <button
                                type="button"
                                class="btn btn-sm btn-outline-primary"
                                @click="openImportOverlay()"
                            ><IconMagic /> {{ $t('puzzles.editor.import_position') }}</button>
                        </div>

                        <div v-if="positionSource" class="alert alert-info py-2 mb-3">{{ $t('puzzles.editor.rewind_help') }}</div>

                        <div class="mb-3">
                            <label class="form-label" for="puzzle-boardsize">{{ $t('puzzles.editor.boardsize') }}</label>
                            <div class="input-group">
                                <input id="puzzle-boardsize" v-model.number="newBoardsize" type="number" class="form-control" :min="MIN_BOARDSIZE" :max="MAX_BOARDSIZE">
                                <button
                                    class="btn btn-outline-primary"
                                    :disabled="newBoardsize === boardsize || !isValidBoardsize(newBoardsize)"
                                    @click="applyBoardsize()"
                                >{{ $t('puzzles.editor.apply') }}</button>
                            </div>
                            <div class="form-text">{{ $t('puzzles.editor.boardsize_help') }}</div>
                        </div>

                        <div class="mb-3">
                            <div class="form-label">{{ $t('puzzles.you_play') }}</div>
                            <div class="btn-group">
                                <button class="btn" :class="0 === playerColor ? 'btn-danger' : 'btn-outline-danger'" @click="setPlayerColor(0)">{{ $t('game.red') }}</button>
                                <button class="btn" :class="1 === playerColor ? 'btn-primary' : 'btn-outline-primary'" @click="setPlayerColor(1)">{{ $t('game.blue') }}</button>
                            </div>
                        </div>

                        <!-- Expert mode, or when puzzle already uses it -->
                        <div v-if="expertMode || alternativesEnabled" class="mb-3">
                            <div class="form-check form-switch">
                                <input
                                    id="puzzle-alternatives"
                                    class="form-check-input"
                                    type="checkbox"
                                    role="switch"
                                    :checked="alternativesEnabled"
                                    :disabled="alternativesEnabled && alternativesUsed"
                                    @change="e => setAlternativesEnabled((e.target as HTMLInputElement).checked)"
                                >
                                <label class="form-check-label" for="puzzle-alternatives"><IconSignpostSplit /> {{ $t('puzzles.editor.alternatives') }}</label>
                            </div>
                            <div class="form-text">{{ $t('puzzles.editor.alternatives_help') }}</div>
                            <div v-if="alternativesEnabled && alternativesUsed" class="form-text">{{ $t('puzzles.editor.alternatives_used') }}</div>

                            <div v-if="alternativesEnabled" class="mt-2">
                                <div class="form-label">{{ $t('puzzles.editor.first_player') }}</div>
                                <div class="btn-group">
                                    <button class="btn" :class="!computerPlaysFirst ? 'btn-primary' : 'btn-outline-primary'" :disabled="!canSetComputerPlaysFirst" @click="setComputerPlaysFirst(false)">{{ $t('puzzles.editor.first_move_player') }}</button>
                                    <button class="btn" :class="computerPlaysFirst ? 'btn-primary' : 'btn-outline-primary'" :disabled="!canSetComputerPlaysFirst" @click="setComputerPlaysFirst(true)">{{ $t('puzzles.editor.first_move_computer') }}</button>
                                </div>
                                <div v-if="!canSetComputerPlaysFirst" class="form-text">{{ $t('puzzles.editor.first_move_locked') }}</div>
                            </div>
                        </div>

                        <div class="mb-3">
                            <div class="form-label">{{ $t('puzzles.editor.place_stones') }}</div>
                            <div class="btn-group flex-wrap">
                                <button class="btn" :class="'red' === positionTool ? 'btn-danger' : 'btn-outline-danger'" @click="positionTool = 'red'"><IconCircleFill /> {{ $t('game.red') }}</button>
                                <button class="btn" :class="'blue' === positionTool ? 'btn-primary' : 'btn-outline-primary'" @click="positionTool = 'blue'"><IconCircleFill /> {{ $t('game.blue') }}</button>
                                <button class="btn" :class="'erase' === positionTool ? 'btn-info' : 'btn-outline-info'" @click="positionTool = 'erase'"><IconEraser /> {{ $t('puzzles.editor.erase') }}</button>
                            </div>
                            <div class="form-text">{{ $t('puzzles.editor.paint_help') }}</div>
                        </div>

                        <div class="mb-3">
                            <div class="form-label">{{ $t('puzzles.editor.last_move_tool') }}</div>
                            <div class="d-flex flex-wrap align-items-center gap-2">
                                <button
                                    class="btn"
                                    :class="'last_move' === positionTool ? 'btn-info' : 'btn-outline-info'"
                                    @click="positionTool = 'last_move'"
                                >{{ $t('puzzles.editor.pick_last_move') }}</button>

                                <span v-if="lastMove" class="badge text-bg-info fs-6">
                                    {{ lastMove }}
                                    <button
                                        type="button"
                                        class="btn-close ms-1 align-middle small"
                                        :aria-label="$t('puzzles.editor.clear_last_move')"
                                        :title="$t('puzzles.editor.clear_last_move')"
                                        @click="clearLastMove()"
                                    ></button>
                                </span>
                                <span v-else class="badge text-bg-warning">{{ $t('puzzles.editor.last_move_undefined') }}</span>
                            </div>
                            <div v-if="'last_move' === positionTool" class="form-text">{{ $t('puzzles.editor.last_move_help') }}</div>
                            <div class="form-text">{{ $t('puzzles.editor.last_move_why') }}</div>
                        </div>

                        <!-- Puzzle isolation -->
                        <h2 class="panel-section-title h4 border-top pt-3 mt-4 mb-3">{{ $t('puzzles.editor.isolation') }}</h2>

                        <div class="mb-3">
                            <button class="btn" :class="'disable' === positionTool ? 'btn-warning' : 'btn-outline-warning'" @click="positionTool = 'disable'"><IconHexagonFill /> {{ $t('puzzles.editor.disable_cell') }}</button>
                            <div class="form-text">{{ $t('puzzles.editor.disable_cell_help') }} {{ $t('puzzles.editor.paint_help') }}</div>
                        </div>

                        <div class="mb-3">
                            <div class="form-label">{{ $t('puzzles.editor.disabled_cells_display') }}</div>
                            <div class="btn-group">
                                <button class="btn btn-disabled-cells-display" :class="!hideDisabledCells ? 'btn-primary' : 'btn-outline-primary'" @click="hideDisabledCells = false">
                                    <img src="/images/puzzle/out-disabled.png" alt="" class="d-block mb-1">
                                    {{ $t('puzzles.editor.disabled_cells_greyed') }}
                                </button>
                                <button class="btn btn-disabled-cells-display" :class="hideDisabledCells ? 'btn-primary' : 'btn-outline-primary'" @click="hideDisabledCells = true">
                                    <img src="/images/puzzle/out-hidden.png" alt="" class="d-block mb-1">
                                    {{ $t('puzzles.editor.disabled_cells_hidden') }}
                                </button>
                            </div>
                            <div class="form-text">{{ $t(hideDisabledCells ? 'puzzles.editor.disabled_cells_hidden_help' : 'puzzles.editor.disabled_cells_greyed_help') }}</div>
                        </div>

                        <div v-if="canEditEdgeConnections" class="mb-3">
                            <AppPuzzleEdgeConnectionTool
                                :selected="'edge' === positionTool"
                                :error="edgeToolError"
                                :impossibleConnections="impossibleEdgeConnections"
                                @select="positionTool = 'edge'"
                            />
                        </div>
                    </template>

                    <!-- Tree -->
                    <template v-else-if="'tree' === step">
                        <p class="small text-body-secondary mb-2">
                            {{ $t('puzzles.editor.tree_help') }}
                            <br>
                            {{ nextColor === playerColor ? $t('puzzles.editor.next_player_move') : $t('puzzles.editor.next_computer_move') }}
                            <span :class="nextColor === 0 ? 'text-danger' : 'text-primary'"><IconCircleFill /> {{ nextColor === 0 ? $t('game.red') : $t('game.blue') }}</span>
                        </p>

                        <div v-if="pickingElse" class="alert alert-warning py-2">{{ $t('puzzles.editor.pick_else_answer') }}</div>
                        <div v-if="'only_one_answer' === boardError" class="alert alert-warning py-2">{{ $t('puzzles.editor.only_one_answer') }}</div>
                        <div v-if="transpositionNotice" class="alert alert-info py-2"><IconArrowReturnRight /> {{ $t('puzzles.editor.transposition_notice', { moves: transpositionNotice.join(' ') }) }}</div>

                        <!-- AI eval -->
                        <div v-if="expertMode" class="mb-3">
                            <div class="d-flex align-items-center gap-2">
                                <label class="form-label small text-nowrap mb-0" for="puzzle-ai-eval"><IconRobot /> {{ $t('puzzles.editor.ai_eval') }}</label>
                                <select
                                    id="puzzle-ai-eval"
                                    class="form-select form-select-sm"
                                    v-model.number="selectedAnalyzerIndex"
                                >
                                    <option :value="-1">{{ $t('puzzles.editor.ai_eval_none') }}</option>
                                    <option
                                        v-for="(a, index) in analyzers"
                                        :key="a.getName()"
                                        :value="index"
                                        :disabled="!isAnalyzerAvailable(a)"
                                    >{{ a.getName() }}</option>
                                    <option
                                        :value="SOLVER_INDEX"
                                        :disabled="!isSolverAvailable"
                                    >{{ $t('puzzles.editor.solver_check_engine') }}</option>
                                </select>
                                <span v-if="analysisLoading" class="spinner-border spinner-border-sm flex-shrink-0" aria-hidden="true"></span>
                            </div>
                            <div class="form-text">{{ $t(solverEnabled ? 'puzzles.editor.solver_eval_help' : 'puzzles.editor.ai_eval_help') }}</div>

                            <p v-if="solverEnabled && solverResult" class="small mt-1 mb-0">{{
                                solverResult.winner === null
                                    ? $t('puzzles.editor.solver_eval_unproven')
                                    : $t(solverResult.winner === (nextColor === 0 ? 'black' : 'white') ? 'puzzles.editor.solver_eval_win' : 'puzzles.editor.solver_eval_loss')
                            }}</p>
                            <div v-if="(analyzer || solverEnabled) && isAnalyzerUnavailable" class="mt-1">
                                <p class="text-warning small mb-0"><IconExclamationTriangle /> {{ $t('hexplorer.engine_unavailable') }}</p>
                                <router-link :to="{ name: 'spawn-worker' }" class="small" target="_blank">{{ $t('workers.see_how_to_spawn_a_worker') }}</router-link>
                            </div>
                            <p v-else-if="analysisError === 'failed'" class="text-danger small mt-1 mb-0"><IconExclamationTriangle /> {{ $t('hexplorer.analysis_failed') }}</p>
                        </div>

                        <div class="move-tree-block position-relative mb-3">
                            <div class="move-tree-wrapper bg-body">
                                <AppPuzzleTreeNode
                                    :node="tree"
                                    :path="[]"
                                    :selectedNode
                                    :playerColor
                                    :firstColor
                                    :transpositions
                                    :nodeErrors
                                    :compact="expertMode && treeZoomedOut"
                                    @select="selectPath"
                                />
                            </div>

                            <button
                                v-if="expertMode"
                                type="button"
                                class="tree-zoom-button btn btn-sm btn-outline-info bg-body"
                                :aria-label="treeZoomedOut ? $t('puzzles.editor.zoom_in') : $t('puzzles.editor.zoom_out')"
                                :title="treeZoomedOut ? $t('puzzles.editor.zoom_in') : $t('puzzles.editor.zoom_out')"
                                @click="treeZoomedOut = !treeZoomedOut"
                            >
                                <IconZoomIn v-if="treeZoomedOut" />
                                <IconZoomOut v-else />
                            </button>

                            <div v-if="alternativesCount > 0" class="small text-body-secondary text-end">{{ $t('puzzles.editor.variations_count', { count: alternativesCount }) }}</div>
                        </div>

                        <!-- Selected node -->
                        <div class="card mb-3">
                            <div class="card-body">
                                <h2 class="h6">
                                    <template v-if="selectedPath.length === 0">{{ $t('puzzles.editor.initial_position') }}</template>
                                    <template v-else-if="isElseNode(selectedNode)">{{ $t('puzzles.editor.else') }} → {{ selectedNode.else }}</template>
                                    <template v-else-if="isParallelRootSelected">{{ $t('puzzles.editor.parallel') }}</template>
                                    <template v-else>{{ selectedNode.move }}</template>
                                </h2>

                                <p v-if="isElseNode(selectedNode)" class="small text-body-secondary">{{ $t('puzzles.editor.else_help') }}</p>
                                <p v-else-if="isParallelRootSelected" class="small text-body-secondary">{{ $t('puzzles.editor.parallel_help') }}</p>
                                <p v-else-if="isInContinuation" class="small text-body-secondary">{{ $t('puzzles.editor.continuation_help') }}</p>

                                <p v-if="selectedTransposition" class="small text-body-secondary">
                                    {{ $t('puzzles.editor.transposition_help', { moves: selectedTransposition.moves.join(' ') }) }}
                                    <button class="btn btn-sm btn-outline-info ms-1" @click="goToTransposition()"><IconArrowReturnRight /> {{ $t('puzzles.editor.go_to_transposition') }}</button>
                                </p>

                                <div v-if="selectedPath.length > 0 && !isElseNode(selectedNode) && !isParallelRootSelected && !isInContinuation && !selectedTransposition" class="mb-2">
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn" :class="!selectedNode.result ? 'btn-primary' : 'btn-outline-primary'" @click="setResult(null)">{{ $t('puzzles.editor.result_none') }}</button>
                                        <button v-if="!isInParallel" class="btn d-inline-flex align-items-center gap-1" :class="'solved' === selectedNode.result ? 'btn-success' : 'btn-outline-success'" @click="setResult('solved')"><span class="result-icon text-bg-success"><IconCheck /></span>{{ $t('puzzles.editor.result_solved') }}</button>
                                        <button class="btn d-inline-flex align-items-center gap-1" :class="'failed' === selectedNode.result ? 'btn-danger' : 'btn-outline-danger'" @click="setResult('failed')"><span class="result-icon text-bg-danger"><IconXLg /></span>{{ $t('puzzles.editor.result_failed') }}</button>
                                    </div>
                                </div>

                                <div class="d-flex flex-wrap gap-1">
                                    <button v-if="expertMode" class="btn btn-sm btn-outline-warning" :disabled="!canAddElse" @click="startPickingElse()"><IconAsterisk /> {{ $t('puzzles.editor.add_else') }}</button>
                                    <button v-if="expertMode" class="btn btn-sm btn-outline-info" :disabled="!canAddParallel" :title="$t('puzzles.editor.parallel_help')" @click="addParallel()"><IconShuffle /> {{ $t('puzzles.editor.add_parallel') }}</button>
                                    <button v-if="isElseNode(selectedNode)" class="btn btn-sm btn-outline-warning" @click="changeElseAnswer()"><IconAsterisk /> {{ $t('puzzles.editor.change_else_answer') }}</button>

                                    <button class="btn btn-sm btn-outline-danger" :disabled="selectedPath.length === 0" @click="deleteSelected()"><IconTrash /> {{ $t('puzzles.editor.delete_node') }}</button>
                                    <button class="btn btn-sm btn-outline-danger" :disabled="!selectedHasChildren" @click="deleteChildren()"><IconTrash /> {{ $t('puzzles.editor.delete_children') }}</button>
                                </div>

                                <div v-if="!isParallelRootSelected" class="mt-2">
                                    <label class="form-label small" for="puzzle-node-message">{{ $t('puzzles.editor.message') }}</label>
                                    <textarea id="puzzle-node-message" v-model="selectedNode.message" class="form-control" rows="2" :maxlength="PUZZLE_MESSAGE_MAX_LENGTH"></textarea>
                                </div>
                            </div>
                        </div>

                    </template>

                    <!-- Engines -->
                    <template v-else-if="'engines' === step">
                        <div v-if="canEditEdgeConnections" class="mb-3">
                            <AppPuzzleEdgeConnectionTool
                                :selected="'edge' === positionTool"
                                :error="edgeToolError"
                                :impossibleConnections="impossibleEdgeConnections"
                                @select="positionTool = 'edge'"
                            />
                        </div>

                        <div v-if="disabledCells.length > 0" class="mb-3">
                            <div class="form-label">{{ $t('puzzles.editor.solver_fill') }}</div>
                            <div class="d-flex flex-wrap gap-2">
                                <button
                                    class="btn"
                                    :class="solverFillPreview ? 'btn-info' : 'btn-outline-info'"
                                    :aria-pressed="solverFillPreview"
                                    @click="toggleSolverFillPreview()"
                                ><IconEye /> {{ $t('puzzles.editor.solver_fill_preview') }}</button>
                                <div class="btn-group">
                                    <button class="btn" :class="'fill_red' === positionTool ? 'btn-danger' : 'btn-outline-danger'" @click="positionTool = 'fill_red'"><IconHexagonFill /> {{ $t('puzzles.editor.solver_fill_red') }}</button>
                                    <button class="btn" :class="'fill_blue' === positionTool ? 'btn-primary' : 'btn-outline-primary'" @click="positionTool = 'fill_blue'"><IconHexagonFill /> {{ $t('puzzles.editor.solver_fill_blue') }}</button>
                                </div>
                            </div>
                            <div class="form-text">{{ $t('puzzles.editor.solver_fill_help') }}</div>
                        </div>

                        <!-- Puzzle check -->
                        <div class="mb-3">
                            <p class="form-text mt-0 mb-2"><IconInfoCircle /> {{ $t(puzzleCheckEngine === 'mohex-solver' ? 'puzzles.editor.solver_check_any_position' : 'puzzles.editor.katahex_check_realistic') }}</p>
                            <div class="d-flex align-items-center gap-2">
                                <select
                                    v-model="puzzleCheckEngine"
                                    class="form-select form-select-sm w-auto"
                                    :aria-label="$t('puzzles.editor.ai_eval')"
                                    :disabled="puzzleChecking"
                                >
                                    <option
                                        v-for="a in analyzers"
                                        :key="a.engine"
                                        :value="a.engine"
                                        :disabled="!isAnalyzerAvailable(a)"
                                    >{{ a.getName() }}</option>
                                    <option
                                        value="mohex-solver"
                                        :disabled="!isSolverAvailable"
                                    >{{ $t('puzzles.editor.solver_check_engine') }}</option>
                                </select>
                                <button
                                    type="button"
                                    class="btn btn-outline-primary btn-sm text-nowrap"
                                    :disabled="errors.length > 0 || puzzleChecking"
                                    @click="runPuzzleCheck(puzzleCheckEngine)"
                                ><IconRobot /> {{ $t(checkKey(puzzleCheckEngine, '')) }}</button>
                                <span v-if="puzzleChecking" class="spinner-border spinner-border-sm flex-shrink-0" aria-hidden="true"></span>
                            </div>
                            <div class="form-text">{{ $t(checkKey(puzzleCheckEngine, '_help')) }}</div>

                            <div v-if="puzzleChecking && puzzleCheck" class="mt-2">
                                <div class="progress" role="progressbar" :aria-valuenow="puzzleCheckProgress" aria-valuemin="0" aria-valuemax="100">
                                    <div class="progress-bar progress-bar-striped progress-bar-animated" :style="{ width: puzzleCheckProgress + '%' }"></div>
                                </div>
                                <p class="small text-body-secondary mb-0">{{ $t(checkKey(puzzleCheck.engine, '_progress'), { done: puzzleCheck.done, total: puzzleCheck.total }) }}</p>
                            </div>

                            <p v-if="puzzleCheckError" class="text-danger small mt-2 mb-0"><IconExclamationTriangle /> {{ puzzleCheckError }}</p>

                            <template v-else-if="puzzleCheck?.status === 'done'">
                                <p v-if="puzzleCheck.warnings.length === 0" class="text-success small mt-2 mb-0">{{ $t(checkKey(puzzleCheck.engine, '_ok')) }}</p>
                                <div v-else class="small text-warning-emphasis mt-2">
                                    <p class="mb-1"><IconExclamationTriangle /> {{ $t(checkKey(puzzleCheck.engine, '_warnings'), { count: puzzleCheck.warnings.length }) }}</p>
                                    <ul class="mb-0 ps-3">
                                        <li v-for="(warning, index) in puzzleCheck.warnings" :key="index">
                                            <a
                                                v-if="warning.path !== undefined"
                                                href="#"
                                                class="link-warning"
                                                @click.prevent="selectErrorNode(warning)"
                                            >{{ translatePuzzleError(warning) }}</a>
                                            <template v-else>{{ translatePuzzleError(warning) }}</template>
                                        </li>
                                    </ul>
                                </div>
                            </template>
                        </div>

                    </template>

                    <!-- Information -->
                    <template v-else-if="'info' === step">
                        <div class="mb-3">
                            <label class="form-label" for="puzzle-title">{{ $t('puzzles.editor.title') }}</label>
                            <input id="puzzle-title" v-model="title" type="text" class="form-control" :maxlength="PUZZLE_TITLE_MAX_LENGTH" :placeholder="$t('puzzles.editor.optional')">
                        </div>

                        <div class="mb-3">
                            <label class="form-label" for="puzzle-description">{{ $t('puzzles.editor.description') }}</label>
                            <textarea id="puzzle-description" v-model="description" class="form-control" rows="2" :maxlength="PUZZLE_DESCRIPTION_MAX_LENGTH" :placeholder="$t('puzzles.editor.optional')"></textarea>
                        </div>

                        <div class="mb-3">
                            <label class="form-label" for="puzzle-collection">{{ $t('puzzles.collections.collection') }}</label>
                            <select id="puzzle-collection" v-model="collectionPublicId" class="form-select">
                                <option :value="null">{{ $t('puzzles.collections.no_collection') }}</option>
                                <option
                                    v-for="collection in collections"
                                    :key="collection.publicId"
                                    :value="collection.publicId"
                                >{{ collection.name }}</option>
                            </select>
                            <div class="form-text">
                                <router-link :to="{ name: 'puzzle-collection-create' }" target="_blank">{{ $t('puzzles.collections.create') }}</router-link>
                            </div>
                        </div>
                    </template>

                    <!-- Board display, in editor only -->
                    <template v-else-if="'display' === step">
                        <div class="mb-3">
                            <div class="form-label">{{ $t('puzzles.editor.board_orientation') }}</div>
                            <div class="btn-group">
                                <button class="btn" :class="null === forcedOrientation ? 'btn-primary' : 'btn-outline-primary'" @click="forcedOrientation = null">{{ $t('auto') }}</button>
                                <button class="btn" :class="'landscape' === forcedOrientation ? 'btn-primary' : 'btn-outline-primary'" @click="forcedOrientation = 'landscape'">{{ $t('landscape') }}</button>
                                <button class="btn" :class="'portrait' === forcedOrientation ? 'btn-primary' : 'btn-outline-primary'" @click="forcedOrientation = 'portrait'">{{ $t('portrait') }}</button>
                            </div>
                        </div>

                        <div class="mb-3">
                            <div class="form-label">{{ $t('puzzles.editor.board_coords') }}</div>
                            <div class="btn-group">
                                <button class="btn" :class="null === forcedShowCoords ? 'btn-primary' : 'btn-outline-primary'" @click="forcedShowCoords = null">{{ $t('auto') }}</button>
                                <button class="btn" :class="true === forcedShowCoords ? 'btn-primary' : 'btn-outline-primary'" @click="forcedShowCoords = true">{{ $t('puzzles.editor.coords_shown') }}</button>
                                <button class="btn" :class="false === forcedShowCoords ? 'btn-primary' : 'btn-outline-primary'" @click="forcedShowCoords = false">{{ $t('puzzles.editor.coords_hidden') }}</button>
                            </div>
                        </div>

                        <div class="form-text">{{ $t('puzzles.editor.board_display_help') }}</div>
                    </template>

                    <!-- Publish -->
                    <template v-else>
                        <div v-if="errors.length > 0" class="small mb-3">
                            <p class="mb-1">{{ $t('puzzles.editor.fix_to_publish', { count: errors.length }) }}</p>
                            <ul class="mb-0 ps-3">
                                <li v-for="(error, index) in errors" :key="index">{{ translatePuzzleError(error) }}</li>
                            </ul>
                        </div>

                        <button
                            v-if="!published"
                            class="btn btn-success"
                            :disabled="errors.length > 0 || saving"
                            @click="save({ publish: true })"
                        ><IconSendFill /> {{ $t('puzzles.editor.save_and_publish') }}</button>

                        <button
                            v-else
                            class="btn btn-outline-warning"
                            :disabled="draftErrors.length > 0 || saving"
                            @click="save({ publish: false })"
                        >{{ $t('puzzles.editor.unpublish') }}</button>

                        <div class="form-text">{{ $t('puzzles.editor.published_help') }}</div>
                    </template>
                </div>

                <div ref="footer-element" class="border-top p-2">
                    <!-- Errors are listed in publish tab -->
                    <button
                        v-if="!canSave && 'publish' !== step"
                        type="button"
                        class="btn btn-link btn-sm text-danger p-0 mb-2"
                        @click="setStep('publish')"
                    >{{ $t('puzzles.editor.errors_count', { count: errors.length }) }}</button>

                    <div v-if="saveError" class="alert alert-danger small py-2 mb-2">{{ saveError }}</div>

                    <div class="d-flex flex-wrap gap-2">
                        <button
                            class="btn btn-success"
                            :disabled="!canSave || saving"
                            @click="save({ stay: true })"
                        >
                            <template v-if="justSaved"><IconCheck /> {{ $t('puzzles.editor.saved') }}</template>
                            <template v-else><IconSave2 /> {{ $t('puzzles.editor.save') }}</template>
                        </button>

                        <button
                            class="btn btn-outline-success"
                            :disabled="!canSave || saving"
                            @click="save()"
                        ><IconPlayFill /> {{ $t('puzzles.editor.save_and_test') }}</button>

                        <button
                            v-if="savedPublicId"
                            class="btn btn-outline-danger ms-auto"
                            :disabled="saving"
                            @click="deletePuzzle()"
                        ><IconTrash /> {{ $t('puzzles.editor.delete') }}</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.puzzle-layout
    height calc(100vh - 3rem) // (fallback if dvh is not supported)
    height calc(100dvh - 3rem) // 3rem = header height

// Sidebar over the board on small screens
@media (max-width: 575.5px)
    .puzzle-sidebar
        position absolute
        top 0
        right 0
        --bs-bg-opacity 0.85

// Default width: panel content as wide as bootstrap cols (6, 5, then 4), plus nav.
// Can be resized up to 3/4 of screen.
.puzzle-sidebar
    --content-width 50%
    --nav-width 12rem
    --sidebar-default-width unquote("min(calc(var(--content-width) + var(--nav-width)), 75%)") // unquote: stylus would compute min() itself

    &.nav-collapsed
        --nav-width 3rem

@media (min-width: 992px)
    .puzzle-sidebar
        --content-width 41.6667%

@media (min-width: 1200px)
    .puzzle-sidebar
        --content-width 33.3333%

@media (min-width: 576px)
    .puzzle-sidebar
        position relative
        flex 0 0 auto
        width var(--sidebar-default-width)

    .puzzle-sidebar.resized
        width clamp(var(--sidebar-default-width), var(--sidebar-width), 75%)

// Discreet double bar, only on middle of sidebar edge
.sidebar-resize-handle
    position absolute
    top 50%
    left 0
    z-index 3
    width 0.75rem
    height 6rem
    transform translate(-50%, -50%)
    cursor col-resize
    touch-action none

    // Single line, just inside sidebar border
    &::before
        content ''
        position absolute
        top 0.5rem
        bottom 0.5rem
        left calc(50% + 2px)
        border-left 1px solid var(--bs-secondary-color)
        opacity 0.5

    &:hover::before
        opacity 1

.puzzle-panel
    min-width 0

// Border on full panel width, like footer border
.panel-section-title
    margin-inline -1rem // p-3 of panel content
    padding-inline 1rem

.board-bar
    min-height calc(2.25rem + 2px + 0.5rem) // button height + py-1

.puzzle-nav
    width var(--nav-width)

// Draft or published, full nav width, opens publish tab
.puzzle-status
    min-height 1.75rem
    padding 0.25rem 0.75rem
    text-align start

// Vertical panels nav, like Gitlab sidebar
.puzzle-nav-item
    display flex
    align-items center
    gap 0.5rem
    padding 0.5rem 0.75rem
    border 0
    background none
    color var(--bs-body-color)
    text-align start
    white-space nowrap

    &:hover
        background-color var(--bs-secondary-bg)

    &.active
        background-color var(--bs-body-bg)
        color var(--bs-primary)
        box-shadow inset 3px 0 0 var(--bs-primary)

.nav-icon-badge
    position absolute
    top -0.15rem
    right -0.3rem
    width 0.5rem
    height 0.5rem
    border-radius 50%

// Tree takes remaining panel height, panel scrolls only on short screens
.move-tree-block
    display flex
    flex-direction column
    flex 1 1 0

// Same as Hexplorer move tree
.move-tree-wrapper
    flex 1 1 0
    min-height 5rem
    overflow auto
    border 1px solid var(--bs-border-color)
    border-radius var(--bs-border-radius)
    padding 0.5rem

.tree-zoom-button
    position absolute
    top 0.25rem
    right 0.25rem
    z-index 2

// Like result nodes in tree
.result-icon
    display inline-flex
    align-items center
    justify-content center
    width 1.3em
    height 1.3em
    border-radius 50%

    svg
        font-size 0.8em

    // Keep circle visible on same colored active button
    .btn-success > &, .btn-danger > &
        box-shadow 0 0 0 1px var(--bs-white)

.btn-disabled-cells-display
    flex 1 1 0

    img
        width 100%
        height 5rem
        object-fit contain
</style>
