<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { Puzzle } from '../../../../shared/app/models/index.js';
import { apiGetPuzzle } from '../../../apiClient.js';
import AppPuzzle from '../components/AppPuzzle.vue';
import { getPuzzleTitle } from '../services/puzzleTitle.js';

const { publicId } = useRoute().params;

if (Array.isArray(publicId)) {
    throw new Error('Unexpected array in publicId parameter');
}

/**
 * null: loading, false: not found
 */
const puzzle = ref<null | false | Puzzle>(null);

useHead({
    title: () => {
        if (!puzzle.value) {
            return t('puzzles.title');
        }

        // Fallback title already starts with "Puzzle"
        return puzzle.value.title
            ? t('puzzles.page_title', { title: puzzle.value.title })
            : getPuzzleTitle(puzzle.value)
        ;
    },
});

void (async () => {
    puzzle.value = await apiGetPuzzle(publicId) ?? false;
})();
</script>

<template>
    <AppPuzzle v-if="puzzle" :puzzle="puzzle" />

    <div v-else-if="null === puzzle" class="container-fluid my-3">
        <p>{{ $t('puzzles.loading') }}</p>
    </div>

    <div v-else class="container-fluid my-3">
        <p>{{ $t('puzzles.not_found') }}</p>
    </div>
</template>
