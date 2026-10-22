<script setup lang="ts">
/*
 * Assisted tree generation from selected node with Mohex solver, expert mode only:
 * player moves are generated in background, author plays computer answers on ready positions.
 * Options are saved on this device.
 */
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { HEX_TEMPLATES } from '../../../../shared/hex-templates/hex-templates.js';
import { type PuzzleGenerateInput, type PuzzleGenerateWarning } from '../../../../shared/app/puzzles/puzzleGenerate.js';
import usePlayerLocalSettingsStore from '../../../stores/playerLocalSettingsStore.js';
import { translatePuzzleError } from '../services/puzzleErrorMessage.js';
import { IconDiagram2, IconExclamationTriangle } from '../../icons.js';

const props = defineProps<{
    canGenerate: boolean;
    solverAvailable: boolean;

    /**
     * Generations running in background.
     */
    generating: boolean;

    /**
     * Positions solved and solves started, of running generations.
     */
    progress: { done: number, total: number };

    /**
     * Nothing left to generate nor to answer.
     */
    done: boolean;

    error: null | string;
    warnings: PuzzleGenerateWarning[];

    /**
     * Positions ready, waiting for a computer answer from author.
     */
    pendingCount: number;

    /**
     * Selected node is a ready position.
     */
    awaitingComputerMove: boolean;

    /**
     * Author answered all ready positions, next ones are being generated.
     */
    waitingForPending: boolean;

    /**
     * Browse positions answered by author during this generation, to check or replace answers.
     */
    canGoBack: boolean;
    canGoForward: boolean;
}>();

const emit = defineEmits<{
    generate: [options: Pick<PuzzleGenerateInput, 'templateIds'>];
    selectWarning: [warning: PuzzleGenerateWarning];
    nextPending: [];
    skipPending: [];
    back: [];
    forward: [];
    stop: [];
}>();

const { localSettings } = storeToRefs(usePlayerLocalSettingsStore());

const templateIds = computed(() => localSettings.value.puzzleGeneratorTemplateIds ?? []);

const toggleTemplate = (id: string, enabled: boolean): void => {
    localSettings.value.puzzleGeneratorTemplateIds = enabled
        ? [...templateIds.value, id]
        : templateIds.value.filter(other => other !== id);
};

const progressPercent = computed(() => props.progress.total === 0
    ? 0
    : Math.round(100 * props.progress.done / props.progress.total),
);

const generate = (): void => {
    emit('generate', {
        // Ignore templates removed since saved
        templateIds: templateIds.value.filter(id => HEX_TEMPLATES.some(template => template.id === id)),
    });
};
</script>

<template>
    <div class="mb-3">
        <h3 class="form-label small mb-0"><IconDiagram2 /> {{ $t('puzzles.editor.generate') }}</h3>

        <p class="form-text mt-1">{{ $t('puzzles.editor.generate_help') }}</p>

        <fieldset class="mb-2">
            <legend class="form-label small mb-1">{{ $t('puzzles.editor.generate_templates') }}</legend>
            <div v-for="template in HEX_TEMPLATES" :key="template.id" class="form-check form-check-inline">
                <input
                    :id="`puzzle-generate-template-${template.id}`"
                    class="form-check-input"
                    type="checkbox"
                    :checked="templateIds.includes(template.id)"
                    @change="toggleTemplate(template.id, ($event.target as HTMLInputElement).checked)"
                >
                <label class="form-check-label small" :for="`puzzle-generate-template-${template.id}`">{{ template.name }}</label>
            </div>
            <div class="form-text">{{ $t(templateIds.length === 0 ? 'puzzles.editor.generate_templates_none' : 'puzzles.editor.generate_templates_help') }}</div>
        </fieldset>

        <div class="d-flex align-items-center gap-2">
            <button
                type="button"
                class="btn btn-outline-primary btn-sm"
                :disabled="!canGenerate || !solverAvailable"
                @click="generate()"
            ><IconDiagram2 /> {{ $t('puzzles.editor.generate_from_node') }}</button>
            <button
                v-if="generating || pendingCount > 0"
                type="button"
                class="btn btn-outline-secondary btn-sm"
                @click="emit('stop')"
            >{{ $t('puzzles.editor.generate_pending_stop') }}</button>
        </div>

        <p v-if="!solverAvailable" class="text-warning small mt-1 mb-0"><IconExclamationTriangle /> {{ $t('hexplorer.engine_unavailable') }}</p>
        <p v-else-if="!canGenerate" class="form-text mt-1 mb-0">{{ $t('puzzles.editor.generate_not_here') }}</p>

        <div v-if="generating" class="mt-2">
            <div class="progress" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar progress-bar-striped progress-bar-animated" :style="{ width: progressPercent + '%' }"></div>
            </div>
            <p class="small text-body-secondary mb-0">{{ $t('puzzles.editor.generate_progress', { done: progress.done, total: progress.total }) }}</p>
        </div>

        <div v-if="pendingCount > 0 || waitingForPending || canGoBack || canGoForward" class="alert alert-info small p-2 mt-2 mb-0">
            <p v-if="awaitingComputerMove" class="mb-1">{{ $t('puzzles.editor.generate_pending') }}</p>
            <p v-else-if="pendingCount > 0" class="mb-1">{{ $t('puzzles.editor.generate_pending_elsewhere') }}</p>
            <p v-else-if="waitingForPending" class="mb-1"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> {{ $t('puzzles.editor.generate_pending_waiting') }}</p>
            <p v-if="pendingCount > 0" class="mb-1 text-body-secondary">{{ $t('puzzles.editor.generate_pending_count', { count: pendingCount }) }}</p>
            <div class="d-flex flex-wrap gap-2">
                <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="!canGoBack" :title="$t('puzzles.editor.generate_back_help')" @click="emit('back')">{{ $t('puzzles.editor.generate_back') }}</button>
                <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="!canGoForward" :title="$t('puzzles.editor.generate_forward_help')" @click="emit('forward')">{{ $t('puzzles.editor.generate_forward') }}</button>
                <template v-if="pendingCount > 0">
                    <button v-if="!awaitingComputerMove" type="button" class="btn btn-primary btn-sm" @click="emit('nextPending')">{{ $t('puzzles.editor.generate_pending_go') }}</button>
                    <button v-else type="button" class="btn btn-outline-secondary btn-sm" @click="emit('skipPending')">{{ $t('puzzles.editor.generate_pending_skip') }}</button>
                </template>
            </div>
        </div>

        <p v-if="error" class="text-danger small mt-2 mb-0"><IconExclamationTriangle /> {{ error }}</p>

        <p v-if="done && !generating && pendingCount === 0 && warnings.length === 0" class="text-success small mt-2 mb-0">{{ $t('puzzles.editor.generate_ok') }}</p>

        <div v-if="warnings.length > 0" class="small text-warning-emphasis mt-2">
            <p class="mb-1"><IconExclamationTriangle /> {{ $t('puzzles.editor.generate_warnings', { count: warnings.length }) }}</p>
            <ul class="mb-0 ps-3">
                <li v-for="(warning, index) in warnings" :key="index">
                    <a
                        v-if="warning.path !== undefined"
                        href="#"
                        class="link-warning"
                        @click.prevent="emit('selectWarning', warning)"
                    >{{ translatePuzzleError(warning) }}</a>
                    <template v-else>{{ translatePuzzleError(warning) }}</template>
                </li>
            </ul>
        </div>
    </div>
</template>
