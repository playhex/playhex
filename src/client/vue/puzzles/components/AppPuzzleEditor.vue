<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useRouter } from 'vue-router';
import { whenever } from '@vueuse/core';
import { t } from 'i18next';
import { Game, Puzzle } from '../../../../shared/app/models/index.js';
import { isElseNode, PUZZLE_DESCRIPTION_MAX_LENGTH, PUZZLE_MESSAGE_MAX_LENGTH, PUZZLE_TITLE_MAX_LENGTH } from '../../../../shared/app/puzzles/puzzleTree.js';
import { MAX_BOARDSIZE, MIN_BOARDSIZE } from '../../../../shared/app/boardsizeLimits.js';
import { apiDeletePuzzle, apiPostPuzzle, apiPutPuzzle } from '../../../apiClient.js';
import { usePuzzleEditor } from '../composables/usePuzzleEditor.js';
import AppPuzzleTreeNode from './AppPuzzleTreeNode.vue';
import { translatePuzzleError } from '../services/puzzleErrorMessage.js';
import { IconArrowBarLeft, IconArrowBarRight, IconArrowDown, IconArrowLeft, IconArrowRight, IconArrowUp, IconChevronBarLeft, IconChevronBarRight, IconChevronLeft, IconChevronRight, IconCircleFill, IconEraser, IconHexagonFill, IconLightbulb, IconSave2, IconSendFill, IconTrash } from '../../icons.js';

const props = defineProps<{
    /**
     * Puzzle to edit, or null to create a new one.
     */
    puzzle: null | Puzzle;

    /**
     * Game to create puzzle from.
     */
    sourceGame: null | Game;
}>();

const {
    mount,
    step,
    setStep,
    title,
    description,
    published,
    boardsize,
    setBoardsize,
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
    canAddElse,
    pickingElse,
    startPickingElse,
    setResult,
    moveSelected,
    deleteSelected,
    boardError,
    errors,
    draftErrors,
    redStones,
    blueStones,
    disabledCells,
    toInput,
} = usePuzzleEditor(props.puzzle, props.sourceGame);

const gameViewElement = useTemplateRef('game-view-element');

whenever(gameViewElement, async element => {
    await mount(element);
}, {
    once: true,
});

const sidebarOpen = ref(true);

const newBoardsize = ref(boardsize.value);

const isValidBoardsize = (size: number): boolean =>
    Number.isInteger(size) && size >= MIN_BOARDSIZE && size <= MAX_BOARDSIZE;

const applyBoardsize = async (): Promise<void> => {
    const isEmpty = redStones.value.length + blueStones.value.length + disabledCells.value.length === 0 && !tree.value.children?.length;

    if (!isEmpty && !confirm(t('puzzles.editor.boardsize_confirm'))) {
        return;
    }

    await setBoardsize(newBoardsize.value);
};

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
        saveError.value = e instanceof Error ? e.message : String(e);
    } finally {
        saving.value = false;
    }
};

/**
 * @param publish Whether puzzle is published after saving, keeps current state by default
 */
const save = (publish = published): Promise<void> => withSaving(async () => {
    const saved = props.puzzle === null
        ? await apiPostPuzzle(toInput(publish))
        : await apiPutPuzzle(props.puzzle.publicId, toInput(publish))
    ;

    await router.push({ name: 'puzzle', params: { publicId: saved.publicId } });
});

/**
 * Published puzzle must stay valid, draft can be incomplete.
 */
const canSave = computed(() => (published ? errors : draftErrors).value.length === 0);

const deletePuzzle = async (): Promise<void> => {
    if (props.puzzle === null || !confirm(t('puzzles.editor.delete_confirm'))) {
        return;
    }

    await withSaving(async () => {
        await apiDeletePuzzle(props.puzzle!.publicId);
        await router.push({ name: 'puzzles-mine' });
    });
};
</script>

<template>
    <div class="puzzle-layout row g-0 flex-nowrap position-relative bg-body">
        <div class="col d-flex flex-column h-100 overflow-hidden">
            <div ref="game-view-element" class="flex-grow-1 overflow-hidden"></div>

            <div class="d-flex flex-wrap justify-content-center align-items-center gap-1 position-relative py-1 px-5">
                <!-- Rewind source game -->
                <div v-if="'position' === step && sourceGame && !puzzle" class="btn-group">
                    <button class="btn btn-outline-primary" @click="setSourceGameMovesCount(0)" :aria-label="$t('puzzles.editor.first_move')"><IconChevronBarLeft /></button>
                    <button class="btn btn-outline-primary" @click="setSourceGameMovesCount(sourceGameMovesCount - 1)" :aria-label="$t('puzzles.editor.previous_move')"><IconChevronLeft /></button>
                    <span class="btn btn-outline-primary disabled text-body">{{ sourceGameMovesCount }} / {{ sourceGame.moves.length }}</span>
                    <button class="btn btn-outline-primary" @click="setSourceGameMovesCount(sourceGameMovesCount + 1)" :aria-label="$t('puzzles.editor.next_move')"><IconChevronRight /></button>
                    <button class="btn btn-outline-primary" @click="setSourceGameMovesCount(sourceGame.moves.length)" :aria-label="$t('puzzles.editor.last_move')"><IconChevronBarRight /></button>
                </div>

                <button
                    v-if="'tree' === step"
                    class="btn btn-outline-primary"
                    :disabled="selectedPath.length === 0"
                    @click="selectParent()"
                ><IconArrowLeft /> {{ $t('puzzles.editor.parent') }}</button>

                <!-- Keep bar height when no button above, so board does not resize when changing tab -->
                <span
                    v-else-if="!('position' === step && sourceGame && !puzzle)"
                    class="btn invisible"
                    aria-hidden="true"
                >&nbsp;</span>

                <button
                    type="button"
                    class="btn btn-outline-primary position-absolute end-0 top-50 translate-middle-y me-2"
                    @click="sidebarOpen = !sidebarOpen"
                >
                    <IconArrowBarLeft v-if="!sidebarOpen" />
                    <IconArrowBarRight v-else />
                </button>
            </div>
        </div>

        <div v-if="sidebarOpen" class="puzzle-sidebar col-sm-6 col-lg-5 col-xl-4 d-flex flex-column h-100 border-start bg-body-tertiary">
            <div class="flex-grow-1 overflow-auto p-3">
                <router-link :to="{ name: 'puzzles-mine' }" class="d-inline-block small mb-2">{{ $t('puzzles.my_puzzles') }}</router-link>

                <h1 class="h4 d-flex align-items-center gap-2">
                    {{ puzzle ? $t('puzzles.editor.edit_title') : $t('puzzles.editor.create_title') }}

                    <!-- Opens publish tab -->
                    <button
                        type="button"
                        class="badge border-0 fs-6"
                        :class="published ? 'text-bg-success' : 'text-bg-warning'"
                        @click="setStep('publish')"
                    >{{ published ? $t('puzzles.published') : $t('puzzles.draft') }}</button>
                </h1>

                <ul class="nav nav-underline mb-3">
                    <li class="nav-item">
                        <button class="nav-link" :class="{ active: 'position' === step }" @click="setStep('position')">1. {{ $t('puzzles.editor.initial_position') }}</button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link" :class="{ active: 'tree' === step }" @click="setStep('tree')">2. {{ $t('puzzles.editor.tree') }}</button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link" :class="{ active: 'publish' === step }" @click="setStep('publish')">3. {{ $t('puzzles.editor.publish_tab') }}</button>
                    </li>
                </ul>

                <!-- Position -->
                <template v-if="'position' === step">
                    <p v-if="sourceGame && !puzzle" class="small text-body-secondary">{{ $t('puzzles.editor.rewind_help') }}</p>
                    <p v-else-if="!puzzle" class="alert alert-info py-2"><IconLightbulb /> {{ $t('puzzles.editor.from_game_help') }}</p>

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

                    <div class="mb-3">
                        <div class="form-label">{{ $t('puzzles.editor.initial_position') }}</div>
                        <div class="btn-group flex-wrap">
                            <button class="btn" :class="'red' === positionTool ? 'btn-danger' : 'btn-outline-danger'" @click="positionTool = 'red'"><IconCircleFill /> {{ $t('game.red') }}</button>
                            <button class="btn" :class="'blue' === positionTool ? 'btn-primary' : 'btn-outline-primary'" @click="positionTool = 'blue'"><IconCircleFill /> {{ $t('game.blue') }}</button>
                            <button class="btn" :class="'erase' === positionTool ? 'btn-secondary' : 'btn-outline-secondary'" @click="positionTool = 'erase'"><IconEraser /> {{ $t('puzzles.editor.erase') }}</button>
                            <button class="btn" :class="'disable' === positionTool ? 'btn-secondary' : 'btn-outline-secondary'" @click="positionTool = 'disable'"><IconHexagonFill /> {{ $t('puzzles.editor.disable_cell') }}</button>
                        </div>
                        <div class="form-text">{{ $t('puzzles.editor.paint_help') }}</div>
                        <div v-if="'disable' === positionTool" class="form-text">{{ $t('puzzles.editor.disable_cell_help') }}</div>
                    </div>

                    <div class="mb-3">
                        <div class="form-label">{{ $t('puzzles.editor.last_move_tool') }}</div>
                        <div class="d-flex flex-wrap align-items-center gap-2">
                            <button
                                class="btn"
                                :class="'last_move' === positionTool ? 'btn-secondary' : 'btn-outline-secondary'"
                                @click="positionTool = 'last_move'"
                            >{{ $t('puzzles.editor.pick_last_move') }}</button>

                            <span v-if="lastMove" class="badge text-bg-secondary fs-6">
                                {{ lastMove }}
                                <button
                                    type="button"
                                    class="btn-close btn-close-white ms-1 align-middle small"
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

                    <button class="btn btn-success" @click="setStep('tree')">{{ $t('puzzles.editor.validate_position') }} <IconArrowRight /></button>
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

                    <div class="move-tree-wrapper bg-body mb-3">
                        <AppPuzzleTreeNode
                            :node="tree"
                            :path="[]"
                            :selectedNode
                            :playerColor
                            @select="selectPath"
                        />
                    </div>

                    <!-- Selected node -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <h2 class="h6">
                                <template v-if="selectedPath.length === 0">{{ $t('puzzles.editor.initial_position') }}</template>
                                <template v-else-if="isElseNode(selectedNode)">{{ $t('puzzles.editor.else') }} → {{ selectedNode.else }}</template>
                                <template v-else>{{ selectedNode.move }}</template>
                            </h2>

                            <p v-if="isElseNode(selectedNode)" class="small text-body-secondary">{{ $t('puzzles.editor.else_help') }}</p>
                            <p v-else-if="isInContinuation" class="small text-body-secondary">{{ $t('puzzles.editor.continuation_help') }}</p>

                            <div v-if="selectedPath.length > 0 && !isElseNode(selectedNode) && !isInContinuation" class="mb-2">
                                <div class="btn-group btn-group-sm">
                                    <button class="btn" :class="!selectedNode.result ? 'btn-secondary' : 'btn-outline-secondary'" @click="setResult(null)">{{ $t('puzzles.editor.result_none') }}</button>
                                    <button class="btn" :class="'solved' === selectedNode.result ? 'btn-success' : 'btn-outline-success'" @click="setResult('solved')">{{ $t('puzzles.editor.result_solved') }}</button>
                                    <button class="btn" :class="'failed' === selectedNode.result ? 'btn-danger' : 'btn-outline-danger'" @click="setResult('failed')">{{ $t('puzzles.editor.result_failed') }}</button>
                                </div>
                            </div>

                            <div class="d-flex flex-wrap gap-1">
                                <button v-if="canAddElse" class="btn btn-sm btn-outline-warning" @click="startPickingElse()">{{ $t('puzzles.editor.add_else') }}</button>
                                <button v-if="isElseNode(selectedNode)" class="btn btn-sm btn-outline-warning" @click="changeElseAnswer()">{{ $t('puzzles.editor.change_else_answer') }}</button>

                                <template v-if="selectedPath.length > 0">
                                    <button v-if="!isElseNode(selectedNode)" class="btn btn-sm btn-outline-secondary" @click="moveSelected(-1)" :aria-label="$t('puzzles.editor.move_up')" :title="$t('puzzles.editor.move_up')"><IconArrowUp /></button>
                                    <button v-if="!isElseNode(selectedNode)" class="btn btn-sm btn-outline-secondary" @click="moveSelected(1)" :aria-label="$t('puzzles.editor.move_down')" :title="$t('puzzles.editor.move_down')"><IconArrowDown /></button>
                                    <button class="btn btn-sm btn-outline-danger" @click="deleteSelected()"><IconTrash /> {{ $t('puzzles.editor.delete_node') }}</button>
                                </template>
                            </div>

                            <div class="mt-2">
                                <label class="form-label small" for="puzzle-node-message">{{ $t('puzzles.editor.message') }}</label>
                                <textarea id="puzzle-node-message" v-model="selectedNode.message" class="form-control" rows="2" :maxlength="PUZZLE_MESSAGE_MAX_LENGTH"></textarea>
                            </div>
                        </div>
                    </div>

                </template>

                <!-- Publish -->
                <template v-else>
                    <div class="mb-3">
                        <label class="form-label" for="puzzle-title">{{ $t('puzzles.editor.title') }}</label>
                        <input id="puzzle-title" v-model="title" type="text" class="form-control" :maxlength="PUZZLE_TITLE_MAX_LENGTH" :placeholder="$t('puzzles.editor.optional')">
                    </div>

                    <div class="mb-3">
                        <label class="form-label" for="puzzle-description">{{ $t('puzzles.editor.description') }}</label>
                        <textarea id="puzzle-description" v-model="description" class="form-control" rows="2" :maxlength="PUZZLE_DESCRIPTION_MAX_LENGTH" :placeholder="$t('puzzles.editor.optional')"></textarea>
                    </div>

                    <div v-if="errors.length > 0" class="small mb-3">
                        <p class="mb-1">{{ $t('puzzles.editor.fix_to_publish') }}</p>
                        <ul class="mb-0 ps-3">
                            <li v-for="(error, index) in errors" :key="index">{{ translatePuzzleError(error) }}</li>
                        </ul>
                    </div>

                    <button
                        v-if="!published"
                        class="btn btn-success"
                        :disabled="errors.length > 0 || saving"
                        @click="save(true)"
                    ><IconSendFill /> {{ $t('puzzles.editor.save_and_publish') }}</button>

                    <button
                        v-else
                        class="btn btn-outline-warning"
                        :disabled="draftErrors.length > 0 || saving"
                        @click="save(false)"
                    >{{ $t('puzzles.editor.unpublish') }}</button>

                    <div class="form-text">{{ $t('puzzles.editor.published_help') }}</div>
                </template>
            </div>

            <div class="border-top p-2">
                <!-- Errors are listed in publish tab -->
                <button
                    v-if="!canSave && 'publish' !== step"
                    type="button"
                    class="btn btn-link btn-sm text-danger p-0 mb-2"
                    @click="setStep('publish')"
                >{{ $t('puzzles.editor.errors_count', { count: errors.length }) }}</button>

                <div v-if="saveError" class="alert alert-danger small py-2 mb-2">{{ saveError }}</div>

                <div class="d-flex gap-2">
                    <button
                        class="btn btn-success flex-grow-1"
                        :disabled="!canSave || saving"
                        @click="save()"
                    ><IconSave2 /> {{ published ? $t('puzzles.editor.save') : $t('puzzles.editor.save_draft') }}</button>

                    <button
                        v-if="puzzle"
                        class="btn btn-outline-danger"
                        :disabled="saving"
                        @click="deletePuzzle()"
                    ><IconTrash /> {{ $t('puzzles.editor.delete') }}</button>
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

// Same as Hexplorer move tree
.move-tree-wrapper
    max-height 12rem
    min-height 5rem
    overflow auto
    border 1px solid var(--bs-border-color)
    border-radius var(--bs-border-radius)
    padding 0.5rem
</style>
