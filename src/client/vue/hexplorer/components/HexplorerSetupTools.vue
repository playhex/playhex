<script setup lang="ts">
/*
 * Setup mode button, then tools to place stones and marks while in setup mode.
 */
import { computed, inject, ref } from 'vue';
import { hexplorerKey } from '../composables/useHexplorer.js';
import { PlaceMarkTool } from '../tools/PlaceMarkTool.js';
import { PlaceStoneTool } from '../tools/PlaceStoneTool.js';
import { PlaceStonesAlternatelyTool } from '../tools/PlaceStonesAlternatelyTool.js';
import { RemoveStoneTool } from '../tools/RemoveStoneTool.js';
import {
    IconAlphabet,
    IconArrowLeft,
    IconArrowRight,
    IconCheck,
    IconCircle,
    IconCircleFill,
    IconCircleHalf,
    IconEraser,
    IconHexagonFill,
    IconPencilSquare,
    IconSquare,
    IconTriangle,
    IconX,
    IconXLg,
} from '../../icons.js';

defineProps<{
    /**
     * Only main tools without titles, to fit under the board on small screens.
     */
    compact?: boolean;
}>();

const {
    gameView,
    state,
    actionsStack,
    currentTool,
    goSetupMode,
    validateSetup,
    cancelSetup,
    createAlternatingTool,
    createRemoveStoneTool,
    createMarkTool,
} = inject(hexplorerKey)!;

const labelText = ref('A');

const isAlternatingToolSelected = computed(() => currentTool.value instanceof PlaceStonesAlternatelyTool);
const isRemoveToolSelected = computed(() => currentTool.value instanceof RemoveStoneTool);
const selectedStoneColor = computed(() => currentTool.value instanceof PlaceStoneTool ? currentTool.value.color : null);
const selectedMarkType = computed(() => currentTool.value instanceof PlaceMarkTool ? currentTool.value.markType : null);

const selectLabelTool = (): void => {
    currentTool.value = createMarkTool('label', labelText);
};
</script>

<template>
    <div v-if="!state.setupMode" :class="{ 'text-center': !compact }">
        <button
            type="button"
            class="btn btn-outline-warning"
            :title="$t('hexplorer.setup_mode')"
            @click="goSetupMode"
        ><IconPencilSquare /> <template v-if="!compact">{{ $t('hexplorer.setup_mode') }}</template></button>
    </div>

    <div v-else class="d-flex flex-column gap-2">
        <div class="d-flex flex-wrap align-items-center justify-content-center gap-2">
            <span class="fw-semibold text-warning"><IconPencilSquare /> {{ $t('hexplorer.setup_mode') }}</span>

            <button
                type="button"
                class="btn btn-sm btn-success"
                :title="$t('hexplorer.save')"
                :aria-label="$t('hexplorer.save')"
                @click="validateSetup()"
            ><IconCheck /> <template v-if="!compact">{{ $t('hexplorer.save') }}</template></button>

            <button
                type="button"
                class="btn btn-sm btn-outline-danger"
                :title="$t('cancel')"
                :aria-label="$t('cancel')"
                @click="cancelSetup()"
            ><IconX /> <template v-if="!compact">{{ $t('cancel') }}</template></button>
        </div>

        <div class="d-flex flex-wrap justify-content-center align-items-end gap-2">
            <div>
                <div v-if="!compact" class="tools-title">{{ $t('hexplorer.tools_history') }}</div>
                <div class="btn-group" :class="{ 'btn-group-sm': compact }">
                    <button
                        @click="actionsStack.undo()"
                        class="btn btn-outline-warning"
                        :disabled="!actionsStack.canUndo()"
                        :title="$t('hexplorer.undo_placement')"
                    ><IconArrowLeft /></button>

                    <button
                        @click="actionsStack.redo()"
                        class="btn btn-outline-warning"
                        :disabled="!actionsStack.canRedo()"
                        :title="$t('hexplorer.redo_placement')"
                    ><IconArrowRight /></button>
                </div>
            </div>

            <div>
                <div v-if="!compact" class="tools-title">{{ $t('hexplorer.tools_stones') }}</div>
                <div class="btn-group" :class="{ 'btn-group-sm': compact }">
                    <button
                        @click="currentTool = createAlternatingTool()"
                        class="btn"
                        :class="isAlternatingToolSelected ? 'btn-success' : 'btn-outline-success'"
                        :title="$t('hexplorer.alternating_placement')"
                    ><IconCircleHalf /></button>

                    <button
                        @click="currentTool = new PlaceStoneTool(gameView, 0)"
                        class="btn"
                        :class="selectedStoneColor === 0 ? 'btn-danger' : 'btn-outline-danger'"
                        :title="$t('hexplorer.place_red_stone')"
                    ><IconCircleFill /></button>

                    <button
                        @click="currentTool = new PlaceStoneTool(gameView, 1)"
                        class="btn"
                        :class="selectedStoneColor === 1 ? 'btn-primary' : 'btn-outline-primary'"
                        :title="$t('hexplorer.place_blue_stone')"
                    ><IconCircleFill /></button>

                    <button
                        @click="currentTool = createRemoveStoneTool()"
                        class="btn"
                        :class="isRemoveToolSelected ? 'btn-warning' : 'btn-outline-warning'"
                        :title="$t('hexplorer.remove_stone')"
                    ><IconEraser /></button>
                </div>
            </div>

            <div>
                <div v-if="!compact" class="tools-title">{{ $t('hexplorer.tools_marks') }}</div>
                <div class="btn-group" :class="{ 'btn-group-sm': compact }">
                    <button
                        @click="currentTool = createMarkTool('cross')"
                        class="btn"
                        :class="selectedMarkType === 'cross' ? 'btn-secondary' : 'btn-outline-secondary'"
                        :title="$t('hexplorer.mark_cross')"
                    ><IconXLg /></button>

                    <template v-if="!compact">
                        <button
                            @click="currentTool = createMarkTool('triangle')"
                            class="btn"
                            :class="selectedMarkType === 'triangle' ? 'btn-secondary' : 'btn-outline-secondary'"
                            :title="$t('hexplorer.mark_triangle')"
                        ><IconTriangle /></button>

                        <button
                            @click="currentTool = createMarkTool('square')"
                            class="btn"
                            :class="selectedMarkType === 'square' ? 'btn-secondary' : 'btn-outline-secondary'"
                            :title="$t('hexplorer.mark_square')"
                        ><IconSquare /></button>

                        <button
                            @click="currentTool = createMarkTool('circle')"
                            class="btn"
                            :class="selectedMarkType === 'circle' ? 'btn-secondary' : 'btn-outline-secondary'"
                            :title="$t('hexplorer.mark_circle')"
                        ><IconCircle /></button>
                    </template>

                    <button
                        @click="currentTool = createMarkTool('select')"
                        class="btn"
                        :class="selectedMarkType === 'select' ? 'btn-secondary' : 'btn-outline-secondary'"
                        :title="$t('hexplorer.highlight_cell')"
                    ><IconHexagonFill class="text-warning" /></button>
                </div>
            </div>

            <div v-if="!compact">
                <div class="tools-title">{{ $t('hexplorer.tools_label') }}</div>
                <div class="input-group label-input">
                    <input
                        type="text"
                        v-model="labelText"
                        maxlength="3"
                        class="form-control"
                        :title="$t('hexplorer.label_text')"
                    >
                    <button
                        @click="selectLabelTool()"
                        class="btn"
                        :class="selectedMarkType === 'label' ? 'btn-info' : 'btn-outline-secondary'"
                        :title="$t('hexplorer.add_label')"
                    ><IconAlphabet /></button>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.tools-title
    font-size 0.75rem
    color var(--bs-secondary-color)

.label-input
    width auto
    flex-wrap nowrap

    input
        width 3.5rem
</style>
