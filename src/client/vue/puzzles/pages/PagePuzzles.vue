<script setup lang="ts">
import { computed, ref } from 'vue';
import { breakpointsBootstrapV5, useBreakpoints } from '@vueuse/core';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { Puzzle, PuzzleCollection } from '../../../../shared/app/models/index.js';
import { apiGetPuzzleCollections, apiGetPuzzles } from '../../../apiClient.js';
import AppPuzzleCard from '../components/AppPuzzleCard.vue';
import AppPuzzleListItem from '../components/AppPuzzleListItem.vue';
import AppPuzzleCollectionListItem from '../components/AppPuzzleCollectionListItem.vue';
import AppBreadcrumb from '../../components/AppBreadcrumb.vue';
import { puzzlesBreadcrumb } from '../services/puzzleBreadcrumb.js';
import { IconPlus } from '../../icons.js';

useHead({
    title: t('puzzles.list_title'),
});

/**
 * All published puzzles, with or without collection.
 */
const puzzles = ref<null | Puzzle[]>(null);
const collections = ref<PuzzleCollection[]>([]);

void (async () => {
    puzzles.value = await apiGetPuzzles();
})();

void (async () => {
    collections.value = await apiGetPuzzleCollections();
})();

/**
 * First puzzles are displayed as cards, as many as screen width allows (1 to 4).
 * Next ones are displayed in list.
 */
const breakpoints = useBreakpoints(breakpointsBootstrapV5);
const isSm = breakpoints.greaterOrEqual('sm');
const isMd = breakpoints.greaterOrEqual('md');
const isLg = breakpoints.greaterOrEqual('lg');

const cardsCount = computed(() => isLg.value ? 4 : isMd.value ? 3 : isSm.value ? 2 : 1);
</script>

<template>
    <div class="container my-3">
        <AppBreadcrumb :items="puzzlesBreadcrumb()" />

        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h1 class="mb-0">{{ $t('puzzles.list_title') }}</h1>

            <div class="d-flex gap-2">
                <router-link
                    :to="{ name: 'puzzles-mine' }"
                    class="btn btn-outline-primary"
                >{{ $t('puzzles.my_puzzles') }}</router-link>

                <router-link
                    :to="{ name: 'puzzle-create' }"
                    class="btn btn-success"
                ><IconPlus /> {{ $t('puzzles.create') }}</router-link>
            </div>
        </div>

        <p v-if="null === puzzles">{{ $t('puzzles.loading_list') }}</p>
        <p v-else-if="0 === puzzles.length" class="text-body-secondary">{{ $t('puzzles.no_puzzles') }}</p>

        <div v-else class="row g-3 mb-3">
            <div
                v-for="puzzle in puzzles.slice(0, cardsCount)"
                :key="puzzle.publicId"
                class="col-12 col-sm-6 col-md-4 col-lg-3"
            >
                <AppPuzzleCard :puzzle />
            </div>
        </div>

        <!-- Next puzzles, and collections in sidebar (at the end on small screens) -->
        <div class="row g-3">
            <div v-if="puzzles && puzzles.length > cardsCount" :class="collections.length > 0 ? 'col-lg-8' : 'col-12'">
                <div class="list-group">
                    <AppPuzzleListItem
                        v-for="puzzle in puzzles.slice(cardsCount)"
                        :key="puzzle.publicId"
                        :puzzle
                    />
                </div>
            </div>

            <div v-if="collections.length > 0" :class="puzzles && puzzles.length > cardsCount ? 'col-lg-4' : 'col-12'">
                <h2 class="h5">{{ $t('puzzles.collections.recently_updated') }}</h2>

                <div class="list-group">
                    <AppPuzzleCollectionListItem
                        v-for="collection in collections"
                        :key="collection.publicId"
                        :collection
                    />
                </div>
            </div>
        </div>
    </div>
</template>
