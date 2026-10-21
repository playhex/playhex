<script setup lang="ts">
/*
 * Generates tree from selected node with Mohex solver, expert mode only.
 * Options are saved on this device.
 */
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { t } from 'i18next';
import { HEX_TEMPLATES } from '../../../../shared/hex-templates/hex-templates.js';
import { GENERATOR_REFUTATION_LENGTHS, type PuzzleGenerateInput, type PuzzleGenerateState, type PuzzleGenerateWarning } from '../../../../shared/app/puzzles/puzzleGenerate.js';
import usePlayerLocalSettingsStore from '../../../stores/playerLocalSettingsStore.js';
import { translatePuzzleError } from '../services/puzzleErrorMessage.js';
import { IconDiagram2, IconExclamationTriangle } from '../../icons.js';

const props = defineProps<{
    canGenerate: boolean;

    /**
     * Selected node already has children or parallel sequences, replaced by generation.
     */
    hasSubtree: boolean;

    solverAvailable: boolean;

    generating: boolean;
    state: null | PuzzleGenerateState;
    error: null | string;
    warnings: PuzzleGenerateWarning[];
}>();

const emit = defineEmits<{
    generate: [options: Pick<PuzzleGenerateInput, 'templateIds' | 'refutationLength'>];
    selectWarning: [warning: PuzzleGenerateWarning];
}>();

const { localSettings } = storeToRefs(usePlayerLocalSettingsStore());

const templateIds = computed(() => localSettings.value.puzzleGeneratorTemplateIds ?? []);

const toggleTemplate = (id: string, enabled: boolean): void => {
    localSettings.value.puzzleGeneratorTemplateIds = enabled
        ? [...templateIds.value, id]
        : templateIds.value.filter(other => other !== id);
};

const refutationLength = computed({
    get: () => localSettings.value.puzzleGeneratorRefutationLength ?? 1,
    set: value => localSettings.value.puzzleGeneratorRefutationLength = value,
});

const progress = computed(() => props.state === null || props.state.total === 0
    ? 0
    : Math.round(100 * props.state.done / props.state.total),
);

const generate = (): void => {
    if (props.hasSubtree && !confirm(t('puzzles.editor.generate_confirm'))) {
        return;
    }

    emit('generate', {
        // Ignore templates removed since saved
        templateIds: templateIds.value.filter(id => HEX_TEMPLATES.some(template => template.id === id)),
        refutationLength: refutationLength.value,
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
                    :disabled="generating"
                    @change="toggleTemplate(template.id, ($event.target as HTMLInputElement).checked)"
                >
                <label class="form-check-label small" :for="`puzzle-generate-template-${template.id}`">{{ template.name }}</label>
            </div>
            <div class="form-text">{{ $t(templateIds.length === 0 ? 'puzzles.editor.generate_templates_none' : 'puzzles.editor.generate_templates_help') }}</div>
        </fieldset>

        <div class="mb-2">
            <label class="form-label small mb-1" for="puzzle-generate-refutation">{{ $t('puzzles.editor.generate_refutation_length') }}</label>
            <select id="puzzle-generate-refutation" v-model.number="refutationLength" class="form-select form-select-sm w-auto" :disabled="generating">
                <option v-for="length in GENERATOR_REFUTATION_LENGTHS" :key="length" :value="length">{{ length }}</option>
            </select>
        </div>

        <div class="d-flex align-items-center gap-2">
            <button
                type="button"
                class="btn btn-outline-primary btn-sm"
                :disabled="!canGenerate || !solverAvailable || generating"
                @click="generate()"
            ><IconDiagram2 /> {{ $t('puzzles.editor.generate_from_node') }}</button>
            <span v-if="generating" class="spinner-border spinner-border-sm flex-shrink-0" aria-hidden="true"></span>
        </div>

        <p v-if="!solverAvailable" class="text-warning small mt-1 mb-0"><IconExclamationTriangle /> {{ $t('hexplorer.engine_unavailable') }}</p>
        <p v-else-if="!canGenerate" class="form-text mt-1 mb-0">{{ $t('puzzles.editor.generate_not_here') }}</p>

        <div v-if="generating && state" class="mt-2">
            <div class="progress" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar progress-bar-striped progress-bar-animated" :style="{ width: progress + '%' }"></div>
            </div>
            <p class="small text-body-secondary mb-0">{{ $t('puzzles.editor.generate_progress', { done: state.done, total: state.total }) }}</p>
        </div>

        <p v-if="error" class="text-danger small mt-2 mb-0"><IconExclamationTriangle /> {{ error }}</p>

        <template v-else-if="state?.status === 'done' && !generating">
            <p v-if="warnings.length === 0" class="text-success small mt-2 mb-0">{{ $t('puzzles.editor.generate_ok') }}</p>
            <div v-else class="small text-warning-emphasis mt-2">
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
        </template>
    </div>
</template>
