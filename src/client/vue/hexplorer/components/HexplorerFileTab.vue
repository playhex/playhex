<script setup lang="ts">
/*
 * Saved study, and all ways to start, load or export an analysis.
 */
import { computed, inject, ref, useTemplateRef } from 'vue';
import { defineOverlay } from '@overlastic/vue';
import { hexplorerKey } from '../composables/useHexplorer.js';
import { hexplorerStudyKey } from '../composables/useHexplorerStudy.js';
import { createHexplorerState, HEXPLORER_STUDY_TITLE_MAX_LENGTH, movesToTreeNodes, parseHexplorerState } from '../../../../shared/app/hexplorerStudy.js';
import { isValidBoardsize, MAX_BOARDSIZE, MIN_BOARDSIZE } from '../../../../shared/app/boardsizeLimits.js';
import type { ImportedGame } from '../../../../shared/app/hex-game-importer/types.js';
import ImportGameOverlay from '../../components/overlay/ImportGameOverlay.vue';
import HexplorerStudiesList from './HexplorerStudiesList.vue';
import {
    IconCheck,
    IconDownload,
    IconExclamationTriangle,
    IconFileEarmarkPlus,
    IconFolder2Open,
    IconMagic,
    IconSave2,
    IconShareFill,
    IconSignpostSplit,
    IconTrash,
} from '../../icons.js';

const props = defineProps<{
    /**
     * Error while importing an analysis passed when opening page.
     */
    importError: null | string;
}>();

const {
    gameView,
    state,
    importGame,
    resetState,
    exportSgf,
    exportAnalysis,
    restoreState,
} = inject(hexplorerKey)!;

const {
    study,
    title,
    loading,
    saving,
    notFound,
    error,
    linkCopied,
    isAuthor,
    canUpdate,
    hasUnsavedChanges,
    save,
    fork,
    remove,
    copyLink,
    closeStudy,
    confirmDiscardChanges,
} = inject(hexplorerStudyKey)!;

const newBoardsize = ref(gameView.value.getBoardsize());

/**
 * Stones placed in setup mode are not in tree until validated, they would not be saved.
 */
const saveDisabled = computed(() => saving.value || loading.value || state.value.setupMode);

const newAnalysis = async (): Promise<void> => {
    if (!confirmDiscardChanges()) {
        return;
    }

    await closeStudy();
    await resetState(newBoardsize.value);
};

/*
 * Import
 */
const importGameOverlay = defineOverlay(ImportGameOverlay);

const openImportOverlay = () => {
    void importGameOverlay({
        onImport: async (importedGame: ImportedGame) => {
            // Refuses a game that cannot be replayed before discarding anything for it
            parseHexplorerState({
                ...createHexplorerState(importedGame.boardsize),
                nodes: importedGame.tree ?? movesToTreeNodes(importedGame.moves),
            });

            if (!confirmDiscardChanges()) {
                return;
            }

            await closeStudy();
            await importGame(importedGame);
        },
    }).catch(() => {
        // dismissed
    });
};

/*
 * Analysis JSON import (whole HexplorerState + move tree)
 */
const analysisFileInput = useTemplateRef<HTMLInputElement>('analysisFileInput');
const analysisFileError = ref<string | null>(null);
const analysisImportError = computed(() => analysisFileError.value ?? props.importError);

const onAnalysisFileSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    analysisFileError.value = null;

    try {
        // Refuses a bad file before discarding anything for it
        const analysis = parseHexplorerState(JSON.parse(await file.text()));

        if (!confirmDiscardChanges()) {
            return;
        }

        await closeStudy();
        await restoreState(analysis);
    } catch (e) {
        analysisFileError.value = e instanceof Error ? e.message : String(e);
    } finally {
        input.value = ''; // allow re-selecting the same file
    }
};
</script>

<template>
    <div>
        <h6 class="mb-2">{{ $t('hexplorer.current_study') }}</h6>

        <p v-if="notFound" class="text-danger small"><IconExclamationTriangle /> {{ $t('hexplorer.study_not_found') }}</p>

        <input
            v-model="title"
            type="text"
            class="form-control form-control-sm mb-2"
            :maxlength="HEXPLORER_STUDY_TITLE_MAX_LENGTH"
            :placeholder="$t('hexplorer.study_default_title')"
            :aria-label="$t('hexplorer.study_title')"
            :disabled="!canUpdate"
        >

        <p v-if="study && !isAuthor && study.author" class="small text-body-secondary mb-1">
            {{ $t('hexplorer.study_by', { author: study.author.pseudo }) }}
        </p>

        <p v-if="study?.forkedFrom" class="small text-body-secondary mb-1">
            <IconSignpostSplit />
            {{ $t('hexplorer.study_forked_from') }}
            <router-link :to="{ name: 'hexplorer', params: { publicId: study.forkedFrom.publicId } }">{{ study.forkedFrom.title || $t('hexplorer.study_default_title') }}</router-link>
        </p>

        <div class="d-flex flex-wrap gap-2 mb-2">
            <button
                type="button"
                class="btn btn-sm btn-success"
                :disabled="saveDisabled || !canUpdate"
                :title="$t('hexplorer.study_save_shortcut')"
                @click="save()"
            ><IconSave2 /> {{ $t('hexplorer.save') }}</button>

            <button
                type="button"
                class="btn btn-sm"
                :class="canUpdate ? 'btn-outline-success' : 'btn-success'"
                :disabled="saveDisabled || !study"
                :title="$t('hexplorer.study_fork_help')"
                @click="fork()"
            ><IconSignpostSplit /> {{ $t('hexplorer.study_fork') }}</button>

            <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                :disabled="!study"
                @click="copyLink()"
            >
                <template v-if="linkCopied"><IconCheck /> {{ $t('hexplorer.study_link_copied') }}</template>
                <template v-else><IconShareFill /> {{ $t('hexplorer.study_share') }}</template>
            </button>

            <button
                type="button"
                class="btn btn-sm btn-outline-danger"
                :disabled="saving || !isAuthor"
                :title="$t('hexplorer.study_delete')"
                @click="remove()"
            ><IconTrash /></button>
        </div>

        <p v-if="!study && !loading" class="small text-body-secondary mb-2">{{ $t('hexplorer.study_save_to_share') }}</p>
        <p v-if="state.setupMode" class="small text-body-secondary mb-2">{{ $t('hexplorer.study_validate_setup_first') }}</p>
        <p v-else-if="hasUnsavedChanges" class="small text-warning mb-2">{{ $t('hexplorer.study_unsaved_changes') }}</p>
        <p v-if="error" class="small text-danger mb-2">{{ error }}</p>

        <h6 class="mb-2">{{ $t('hexplorer.export') }}</h6>

        <div class="d-flex flex-wrap gap-2 mb-2">
            <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                :title="$t('hexplorer.download_sgf')"
                @click="exportSgf()"
            ><IconDownload /> SGF</button>

            <button
                type="button"
                class="btn btn-sm btn-outline-success"
                :title="$t('hexplorer.analysis_json_save')"
                @click="exportAnalysis()"
            ><IconSave2 /> {{ $t('hexplorer.save') }} JSON</button>
        </div>

        <hr>

        <h6 class="mb-2">{{ $t('hexplorer.new_study') }}</h6>

        <div class="d-flex flex-wrap gap-2 mb-2">
            <div class="input-group input-group-sm" style="max-width: 9rem" :title="$t('hexplorer.new_analysis')">
                <input
                    type="number"
                    :min="MIN_BOARDSIZE"
                    :max="MAX_BOARDSIZE"
                    v-model.number="newBoardsize"
                    class="form-control"
                >
                <button
                    class="btn btn-outline-warning"
                    :disabled="!isValidBoardsize(newBoardsize)"
                    @click="newAnalysis()"
                ><IconFileEarmarkPlus /> {{ $t('hexplorer.new') }}</button>
            </div>

            <button
                type="button"
                class="btn btn-sm btn-outline-warning flex-grow-1"
                :title="$t('hexplorer.analysis_json_load')"
                @click="analysisFileInput?.click()"
            ><IconFolder2Open /> {{ $t('hexplorer.load') }} JSON</button>
        </div>
        <input
            ref="analysisFileInput"
            type="file"
            accept="application/json,.json"
            class="d-none"
            @change="onAnalysisFileSelected"
        >
        <div v-if="analysisImportError" class="text-danger small mb-2">{{ analysisImportError }}</div>

        <button
            class="btn btn-outline-info w-100 mb-3 d-flex align-items-center justify-content-center gap-2"
            @click="openImportOverlay()"
        ><IconMagic /> {{ $t('hexplorer.import_a_game') }}</button>

        <HexplorerStudiesList />
    </div>
</template>
