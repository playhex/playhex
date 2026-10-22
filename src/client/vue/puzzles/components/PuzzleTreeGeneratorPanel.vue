<script setup lang="ts">
/*
 * Tree generation from selected node with Mohex solver, expert mode only:
 * player winning moves from solver, computer answers from katahex policy.
 */
import { computed } from 'vue';
import { HEX_TEMPLATES } from '../../../../shared/hex-templates/hex-templates.js';
import { type PuzzleGenerateInput, type PuzzleGenerateWarning, withRequiredTemplates } from '../../../../shared/app/puzzles/puzzleGenerate.js';
import { translatePuzzleError } from '../services/puzzleErrorMessage.js';
import { IconDiagram2, IconExclamationTriangle, IconInfoCircle } from '../../icons.js';

const props = defineProps<{
    canGenerate: boolean;
    solverAvailable: boolean;

    /**
     * Generation running in background.
     */
    generating: boolean;

    /**
     * Positions solved and solves started, of running generation.
     */
    progress: { done: number, total: number };

    /**
     * Last generation finished and inserted in tree.
     */
    done: boolean;

    error: null | string;
    warnings: PuzzleGenerateWarning[];
}>();

const emit = defineEmits<{
    generate: [options: Pick<PuzzleGenerateInput, 'templateIds'>];
    selectWarning: [warning: PuzzleGenerateWarning];
    stop: [];
}>();

/**
 * Template the player is supposed to know, or null for none.
 * Templates it requires are sent too: ziggurat cannot be known without bridge.
 * Kept by parent, to not reset when switching panels.
 */
const templateId = defineModel<null | string>('templateId', { required: true });

const templateIds = computed(() => templateId.value === null ? [] : withRequiredTemplates(templateId.value));

const progressPercent = computed(() => props.progress.total === 0
    ? 0
    : Math.round(100 * props.progress.done / props.progress.total),
);

const generate = (): void => {
    emit('generate', { templateIds: templateIds.value });
};
</script>

<template>
    <div class="mb-3">
        <p class="form-text mt-0">{{ $t('puzzles.editor.generate_help') }}</p>

        <fieldset class="mb-2">
            <legend class="form-label small mb-1">
                {{ $t('puzzles.editor.generate_templates') }}
                <span class="text-body-secondary" :title="$t(templateIds.length === 0 ? 'puzzles.editor.generate_templates_none' : 'puzzles.editor.generate_templates_help')"><IconInfoCircle /></span>
            </legend>
            <div class="form-check form-check-inline">
                <input
                    id="puzzle-generate-template-none"
                    class="form-check-input"
                    type="radio"
                    name="puzzle-generate-template"
                    :checked="templateId === null"
                    @change="templateId = null"
                >
                <label class="form-check-label small" for="puzzle-generate-template-none">{{ $t('puzzles.editor.generate_templates_none_option') }}</label>
            </div>
            <div v-for="template in HEX_TEMPLATES" :key="template.id" class="form-check form-check-inline">
                <input
                    :id="`puzzle-generate-template-${template.id}`"
                    class="form-check-input"
                    type="radio"
                    name="puzzle-generate-template"
                    :checked="templateId === template.id"
                    @change="templateId = template.id"
                >
                <label class="form-check-label small" :for="`puzzle-generate-template-${template.id}`">{{ template.name }}</label>
            </div>
        </fieldset>

        <div class="d-flex align-items-center gap-2">
            <button
                type="button"
                class="btn btn-outline-primary btn-sm"
                :disabled="!canGenerate || !solverAvailable || generating"
                @click="generate()"
            ><IconDiagram2 /> {{ $t('puzzles.editor.generate_from_node') }}</button>
            <button
                v-if="generating"
                type="button"
                class="btn btn-outline-secondary btn-sm"
                @click="emit('stop')"
            >{{ $t('puzzles.editor.generate_stop') }}</button>
        </div>

        <p v-if="!solverAvailable" class="text-warning small mt-1 mb-0"><IconExclamationTriangle /> {{ $t('hexplorer.engine_unavailable') }}</p>
        <p v-else-if="!canGenerate" class="form-text mt-1 mb-0">{{ $t('puzzles.editor.generate_not_here') }}</p>

        <div v-if="generating" class="mt-2">
            <div class="progress" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar progress-bar-striped progress-bar-animated" :style="{ width: progressPercent + '%' }"></div>
            </div>
            <p class="small text-body-secondary mb-0">{{ $t('puzzles.editor.generate_progress', { done: progress.done, total: progress.total }) }}</p>
        </div>

        <p v-if="error" class="text-danger small mt-2 mb-0"><IconExclamationTriangle /> {{ error }}</p>

        <p v-if="done && !generating && warnings.length === 0" class="text-success small mt-2 mb-0">{{ $t('puzzles.editor.generate_ok') }}</p>

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
