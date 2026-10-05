<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { PuzzleCollection } from '../../../../shared/app/models/index.js';
import { PUZZLE_COLLECTION_DESCRIPTION_MAX_LENGTH, PUZZLE_COLLECTION_NAME_MAX_LENGTH } from '../../../../shared/app/puzzles/puzzleCollection.js';
import { apiDeletePuzzleCollection, apiGetPuzzleCollection, apiPostPuzzleCollection, apiPutPuzzleCollection } from '../../../apiClient.js';
import useAuthStore from '../../../stores/authStore.js';
import AppBreadcrumb from '../../components/AppBreadcrumb.vue';
import { puzzleCollectionEditorBreadcrumb } from '../services/puzzleBreadcrumb.js';
import { IconSave2, IconTrash } from '../../icons.js';
import { apiErrorMessage } from '../../../services/apiErrorMessage.js';

/*
 * Create a collection (/puzzles/collections/new),
 * or edit an existing one (/puzzles/collections/<publicId>/edit).
 */

const route = useRoute();
const router = useRouter();
const { loggedInPlayer } = storeToRefs(useAuthStore());

const publicId = typeof route.params.publicId === 'string' ? route.params.publicId : null;

useHead({
    title: t(publicId === null ? 'puzzles.collections.create' : 'puzzles.collections.edit'),
});

type LoadState =
    | { state: 'loading' }
    | { state: 'error', errorKey: string }
    | { state: 'ready', collection: null | PuzzleCollection }
;

const load = ref<LoadState>({ state: 'loading' });

const name = ref('');
const description = ref('');

watch(loggedInPlayer, async player => {
    // Wait for player, and load only once
    if (player === null || load.value.state !== 'loading') {
        return;
    }

    if (publicId === null) {
        load.value = { state: 'ready', collection: null };
        return;
    }

    const result = await apiGetPuzzleCollection(publicId);

    if (result === null) {
        load.value = { state: 'error', errorKey: 'puzzles.collections.not_found' };
    } else if (result.collection.author?.publicId !== player.publicId) {
        load.value = { state: 'error', errorKey: 'puzzles.collections.not_author' };
    } else {
        name.value = result.collection.name;
        description.value = result.collection.description ?? '';
        load.value = { state: 'ready', collection: result.collection };
    }
}, { immediate: true });

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

const save = (): Promise<void> => withSaving(async () => {
    const input = { name: name.value, description: description.value };
    const saved = publicId === null
        ? await apiPostPuzzleCollection(input)
        : await apiPutPuzzleCollection(publicId, input)
    ;

    await router.push({ name: 'puzzle-collection', params: { publicId: saved.publicId } });
});

const deleteCollection = async (): Promise<void> => {
    if (publicId === null || !confirm(t('puzzles.collections.delete_confirm'))) {
        return;
    }

    await withSaving(async () => {
        await apiDeletePuzzleCollection(publicId);
        await router.push({ name: 'puzzles-mine' });
    });
};
</script>

<template>
    <div class="container my-3">
        <template v-if="'ready' === load.state">
            <AppBreadcrumb :items="puzzleCollectionEditorBreadcrumb(load.collection)" />

            <h1>{{ $t(load.collection === null ? 'puzzles.collections.create' : 'puzzles.collections.edit') }}</h1>

            <form class="col-lg-8" @submit.prevent="save()">
                <div class="mb-3">
                    <label class="form-label" for="collection-name">{{ $t('puzzles.collections.name') }}</label>
                    <input id="collection-name" v-model="name" type="text" class="form-control" required :maxlength="PUZZLE_COLLECTION_NAME_MAX_LENGTH">
                </div>

                <div class="mb-3">
                    <label class="form-label" for="collection-description">{{ $t('puzzles.editor.description') }}</label>
                    <textarea id="collection-description" v-model="description" class="form-control" rows="3" :maxlength="PUZZLE_COLLECTION_DESCRIPTION_MAX_LENGTH" :placeholder="$t('puzzles.editor.optional')"></textarea>
                </div>

                <div v-if="saveError" class="alert alert-danger small py-2">{{ saveError }}</div>

                <div class="d-flex flex-wrap gap-2">
                    <button type="submit" class="btn btn-success" :disabled="saving"><IconSave2 /> {{ $t('puzzles.editor.save') }}</button>

                    <button
                        v-if="load.collection !== null"
                        type="button"
                        class="btn btn-outline-danger ms-auto"
                        :disabled="saving"
                        @click="deleteCollection()"
                    ><IconTrash /> {{ $t('puzzles.collections.delete') }}</button>
                </div>
            </form>
        </template>

        <p v-else-if="'loading' === load.state">{{ $t('puzzles.loading') }}</p>
        <p v-else class="text-danger">{{ $t(load.errorKey) }}</p>
    </div>
</template>
