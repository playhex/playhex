<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { Puzzle } from '../../../../shared/app/models/index.js';
import { getPuzzleTitle } from '../services/puzzleTitle.js';
import { apiGetPuzzleDrafts, apiGetPuzzles } from '../../../apiClient.js';
import useAuthStore from '../../../stores/authStore.js';
import AppPuzzleCard from '../components/AppPuzzleCard.vue';
import { formatPuzzleDate } from '../services/puzzleDate.js';
import { IconPlus } from '../../icons.js';

useHead({
    title: t('puzzles.list_title'),
});

const { loggedInPlayer } = storeToRefs(useAuthStore());

const puzzles = ref<null | Puzzle[]>(null);
const drafts = ref<Puzzle[]>([]);

void (async () => {
    puzzles.value = await apiGetPuzzles();
})();

watch(loggedInPlayer, async player => {
    drafts.value = player
        ? await apiGetPuzzleDrafts()
        : []
    ;
}, { immediate: true });

/**
 * First puzzles are displayed as cards, as many as screen width allows (1 to 4).
 * The ones hidden as card are displayed in list instead.
 */
const cardClasses = ['', 'd-none d-sm-block', 'd-none d-md-block', 'd-none d-lg-block'];
const listItemClasses = ['d-none', 'd-sm-none', 'd-md-none', 'd-lg-none'];
</script>

<template>
    <div class="container my-3">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h1 class="mb-0">{{ $t('puzzles.list_title') }}</h1>

            <router-link
                :to="{ name: 'puzzle-create' }"
                class="btn btn-success"
            ><IconPlus /> {{ $t('puzzles.create') }}</router-link>
        </div>

        <p v-if="null === puzzles">{{ $t('puzzles.loading_list') }}</p>
        <p v-else-if="0 === puzzles.length" class="text-body-secondary">{{ $t('puzzles.no_puzzles') }}</p>

        <template v-else>
            <div class="row g-3 mb-3">
                <div
                    v-for="(puzzle, index) in puzzles.slice(0, 4)"
                    :key="puzzle.publicId"
                    class="col-12 col-sm-6 col-md-4 col-lg-3"
                    :class="cardClasses[index]"
                >
                    <AppPuzzleCard :puzzle />
                </div>
            </div>

            <div class="list-group">
                <router-link
                    v-for="(puzzle, index) in puzzles"
                    :key="puzzle.publicId"
                    :to="{ name: 'puzzle', params: { publicId: puzzle.publicId } }"
                    class="list-group-item list-group-item-action d-flex justify-content-between gap-2"
                    :class="listItemClasses[index]"
                >
                    <span class="text-truncate">{{ getPuzzleTitle(puzzle) }}</span>
                    <span class="text-body-secondary small text-nowrap">
                        <template v-if="puzzle.author">{{ puzzle.author.pseudo }} · </template>
                        {{ puzzle.boardsize }}×{{ puzzle.boardsize }} · {{ formatPuzzleDate(puzzle) }}
                    </span>
                </router-link>
            </div>
        </template>

        <template v-if="drafts.length > 0">
            <h2 class="h4 mt-4">{{ $t('puzzles.my_drafts') }}</h2>

            <div class="list-group">
                <router-link
                    v-for="puzzle in drafts"
                    :key="puzzle.publicId"
                    :to="{ name: 'puzzle', params: { publicId: puzzle.publicId } }"
                    class="list-group-item list-group-item-action d-flex justify-content-between gap-2"
                >
                    <span class="text-truncate">{{ getPuzzleTitle(puzzle) }}</span>
                    <span class="text-body-secondary small text-nowrap">{{ puzzle.boardsize }}×{{ puzzle.boardsize }} · {{ formatPuzzleDate(puzzle) }}</span>
                </router-link>
            </div>
        </template>
    </div>
</template>
