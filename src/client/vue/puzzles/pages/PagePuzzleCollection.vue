<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { intlFormat } from 'date-fns';
import { Puzzle, PuzzleCollection } from '../../../../shared/app/models/index.js';
import { autoLocale } from '../../../../shared/app/i18n/index.js';
import { moveInList } from '../../../../shared/app/puzzles/puzzleCollection.js';
import { apiGetMyPuzzles, apiGetPuzzleCollection, apiPutPuzzleCollectionPuzzles } from '../../../apiClient.js';
import useAuthStore from '../../../stores/authStore.js';
import AppBreadcrumb from '../../components/AppBreadcrumb.vue';
import AppPseudo from '../../components/AppPseudo.vue';
import { puzzleCollectionBreadcrumb } from '../services/puzzleBreadcrumb.js';
import { getPuzzleTitle } from '../services/puzzleTitle.js';
import { IconArrowDown, IconArrowUp, IconPencilSquare, IconPlayFill, IconPlus, IconXLg } from '../../icons.js';

const { publicId } = useRoute().params;

if (Array.isArray(publicId)) {
    throw new Error('Unexpected array in publicId parameter');
}

const { loggedInPlayer } = storeToRefs(useAuthStore());

/**
 * null: loading, false: not found
 */
const collection = ref<null | false | PuzzleCollection>(null);

/**
 * Collection puzzles in order, drafts included for author.
 */
const puzzles = ref<Puzzle[]>([]);

useHead({
    title: () => collection.value
        ? t('puzzles.collections.page_title', { name: collection.value.name })
        : t('puzzles.collections.title'),
});

const isAuthor = computed(() => !!collection.value
    && !!collection.value.author
    && collection.value.author.publicId === loggedInPlayer.value?.publicId,
);

/**
 * Author puzzles not in this collection, that can be added.
 */
const otherPuzzles = ref<Puzzle[]>([]);
const puzzleToAdd = ref<null | string>(null);

const loadOtherPuzzles = async (): Promise<void> => {
    otherPuzzles.value = (await apiGetMyPuzzles()).filter(puzzle => puzzle.collection?.publicId !== publicId);
};

/**
 * Incremented on each load, to ignore responses of a previous load.
 */
let loadId = 0;

// Reload when player changes, author also sees drafts
watch(loggedInPlayer, async player => {
    if (player === null) {
        return;
    }

    const currentLoadId = ++loadId;
    const result = await apiGetPuzzleCollection(publicId);

    if (currentLoadId !== loadId) {
        return;
    }

    collection.value = result?.collection ?? false;
    puzzles.value = result?.puzzles ?? [];
    otherPuzzles.value = [];

    if (isAuthor.value) {
        await loadOtherPuzzles();
    }
}, { immediate: true });

const firstPublishedPuzzle = computed(() => puzzles.value.find(puzzle => puzzle.published) ?? null);

/*
 * Author: add, remove, reorder
 */

const saving = ref(false);
const saveError = ref<null | string>(null);

/**
 * Saves new puzzles order.
 *
 * @param puzzlesChanged Whether puzzles have been added or removed, not only reordered, to refresh puzzles that can be added
 *
 * @returns Whether it has been saved
 */
const savePuzzles = async (newPuzzles: Puzzle[], puzzlesChanged: boolean): Promise<boolean> => {
    saving.value = true;
    saveError.value = null;

    try {
        await apiPutPuzzleCollectionPuzzles(publicId, newPuzzles.map(puzzle => puzzle.publicId));
        puzzles.value = newPuzzles;

        if (collection.value) {
            collection.value.updatedAt = new Date();
        }

        if (puzzlesChanged) {
            await loadOtherPuzzles();
        }

        return true;
    } catch (e) {
        saveError.value = e instanceof Error ? e.message : String(e);

        return false;
    } finally {
        saving.value = false;
    }
};

const move = (index: number, offset: number) => savePuzzles(moveInList(puzzles.value, index, offset), false);

const remove = (index: number) => savePuzzles(puzzles.value.filter((_, i) => i !== index), true);

const add = async (): Promise<void> => {
    const puzzle = otherPuzzles.value.find(puzzle => puzzle.publicId === puzzleToAdd.value);

    if (!puzzle) {
        return;
    }

    if (await savePuzzles([...puzzles.value, puzzle], true)) {
        puzzleToAdd.value = null;
    }
};

const formatDate = (date: Date): string => intlFormat(
    date,
    { day: 'numeric', month: 'long', year: 'numeric' },
    { locale: autoLocale() },
);
</script>

<template>
    <div class="container my-3">
        <template v-if="collection">
            <AppBreadcrumb :items="puzzleCollectionBreadcrumb(collection)" />

            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                <h1 class="mb-0">{{ collection.name }}</h1>

                <div class="d-flex gap-2">
                    <router-link
                        v-if="isAuthor"
                        :to="{ name: 'puzzle-collection-edit', params: { publicId: collection.publicId } }"
                        class="btn btn-outline-primary"
                    ><IconPencilSquare /> {{ $t('puzzles.edit') }}</router-link>

                    <router-link
                        v-if="firstPublishedPuzzle"
                        :to="{ name: 'puzzle', params: { publicId: firstPublishedPuzzle.publicId } }"
                        class="btn btn-success"
                    ><IconPlayFill /> {{ $t('puzzles.collections.start') }}</router-link>
                </div>
            </div>

            <p class="small text-body-secondary">
                <template v-if="collection.author">{{ $t('puzzles.by') }} <AppPseudo :player="collection.author" /> · </template>
                {{ $t('puzzles.collections.updated_at', { date: formatDate(collection.updatedAt) }) }}
            </p>

            <p v-if="collection.description" class="pre-line">{{ collection.description }}</p>

            <div v-if="saveError" class="alert alert-danger small py-2">{{ saveError }}</div>

            <p v-if="0 === puzzles.length" class="text-body-secondary">{{ $t('puzzles.collections.empty') }}</p>

            <ol v-else class="list-group list-group-numbered mb-3">
                <li
                    v-for="(puzzle, index) in puzzles"
                    :key="puzzle.publicId"
                    class="list-group-item d-flex align-items-center gap-2"
                >
                    <router-link
                        :to="{ name: 'puzzle', params: { publicId: puzzle.publicId } }"
                        class="flex-grow-1 text-truncate"
                    >{{ getPuzzleTitle(puzzle) }}</router-link>

                    <span v-if="!puzzle.published" class="badge text-bg-warning">{{ $t('puzzles.draft') }}</span>

                    <div v-if="isAuthor" class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary" :disabled="saving || 0 === index" @click="move(index, -1)" :aria-label="$t('puzzles.editor.move_up')" :title="$t('puzzles.editor.move_up')"><IconArrowUp /></button>
                        <button class="btn btn-outline-secondary" :disabled="saving || puzzles.length - 1 === index" @click="move(index, 1)" :aria-label="$t('puzzles.editor.move_down')" :title="$t('puzzles.editor.move_down')"><IconArrowDown /></button>
                        <button class="btn btn-outline-danger" :disabled="saving" @click="remove(index)" :aria-label="$t('puzzles.collections.remove')" :title="$t('puzzles.collections.remove')"><IconXLg /></button>
                    </div>
                </li>
            </ol>

            <form v-if="isAuthor" class="d-flex flex-wrap gap-2 col-lg-8" @submit.prevent="add()">
                <select v-model="puzzleToAdd" class="form-select w-auto flex-grow-1" :aria-label="$t('puzzles.collections.add_puzzle')">
                    <option :value="null" disabled>{{ $t('puzzles.collections.add_puzzle') }}</option>
                    <option v-for="puzzle in otherPuzzles" :key="puzzle.publicId" :value="puzzle.publicId">
                        {{ getPuzzleTitle(puzzle) }}{{ puzzle.published ? '' : ` (${$t('puzzles.draft')})` }}{{ puzzle.collection ? ` — ${puzzle.collection.name}` : '' }}
                    </option>
                </select>

                <button type="submit" class="btn btn-outline-success" :disabled="saving || null === puzzleToAdd"><IconPlus /> {{ $t('puzzles.collections.add') }}</button>

                <router-link
                    :to="{ name: 'puzzle-create', query: { collection: collection.publicId } }"
                    class="btn btn-success"
                ><IconPlus /> {{ $t('puzzles.collections.create_puzzle') }}</router-link>
            </form>
        </template>

        <p v-else-if="null === collection">{{ $t('puzzles.loading') }}</p>
        <p v-else>{{ $t('puzzles.collections.not_found') }}</p>
    </div>
</template>

<style lang="stylus" scoped>
.pre-line
    white-space pre-line
</style>
