<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { Puzzle, PuzzleCollection } from '../../../../shared/app/models/index.js';
import { apiGetMyPuzzleCollections, apiGetMyPuzzles } from '../../../apiClient.js';
import useAuthStore from '../../../stores/authStore.js';
import AppPuzzleListItem from '../components/AppPuzzleListItem.vue';
import AppPuzzleCollectionListItem from '../components/AppPuzzleCollectionListItem.vue';
import AppBreadcrumb from '../../components/AppBreadcrumb.vue';
import { myPuzzlesBreadcrumb } from '../services/puzzleBreadcrumb.js';
import { IconPlus } from '../../icons.js';

useHead({
    title: t('puzzles.my_puzzles'),
});

const { loggedInPlayer } = storeToRefs(useAuthStore());

/**
 * null: loading
 */
const puzzles = ref<null | Puzzle[]>(null);
const collections = ref<PuzzleCollection[]>([]);

watch(loggedInPlayer, async player => {
    if (player === null) {
        return;
    }

    [puzzles.value, collections.value] = await Promise.all([
        apiGetMyPuzzles(),
        apiGetMyPuzzleCollections(),
    ]);
}, { immediate: true });

const drafts = computed(() => puzzles.value?.filter(puzzle => !puzzle.published) ?? []);
const published = computed(() => puzzles.value?.filter(puzzle => puzzle.published) ?? []);
</script>

<template>
    <div class="container my-3">
        <AppBreadcrumb :items="myPuzzlesBreadcrumb()" />

        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h1 class="mb-0">{{ $t('puzzles.my_puzzles') }}</h1>

            <router-link
                :to="{ name: 'puzzle-create' }"
                class="btn btn-success"
            ><IconPlus /> {{ $t('puzzles.create') }}</router-link>
        </div>

        <p v-if="null === puzzles">{{ $t('puzzles.loading_list') }}</p>

        <div v-else class="row g-4">
            <div class="col-lg-8">
                <h2 class="h4">{{ $t('puzzles.my_published') }}</h2>

                <div v-if="published.length > 0" class="list-group">
                    <AppPuzzleListItem
                        v-for="puzzle in published"
                        :key="puzzle.publicId"
                        :puzzle
                        :showAuthor="false"
                    />
                </div>
                <p v-else class="text-body-secondary">{{ $t('puzzles.no_published') }}</p>
            </div>

            <!-- Drafts first on small screens, as puzzles to finish -->
            <div class="col-lg-4 order-first order-lg-last">
                <div class="card" :class="{ 'border-warning': drafts.length > 0 }">
                    <h2 class="card-header h5" :class="{ 'text-bg-warning': drafts.length > 0 }">{{ $t('puzzles.my_drafts') }}</h2>

                    <div v-if="drafts.length > 0" class="list-group list-group-flush">
                        <AppPuzzleListItem
                            v-for="puzzle in drafts"
                            :key="puzzle.publicId"
                            :puzzle
                            :showAuthor="false"
                        />
                    </div>
                    <div v-else class="card-body">
                        <p class="text-body-secondary">{{ $t('puzzles.no_drafts') }}</p>

                        <router-link
                            :to="{ name: 'puzzle-create' }"
                            class="btn btn-sm btn-outline-success"
                        ><IconPlus /> {{ $t('puzzles.create') }}</router-link>
                    </div>
                </div>

                <div class="card mt-4">
                    <h2 class="card-header h5">{{ $t('puzzles.collections.mine') }}</h2>

                    <div v-if="collections.length > 0" class="list-group list-group-flush">
                        <AppPuzzleCollectionListItem
                            v-for="collection in collections"
                            :key="collection.publicId"
                            :collection
                            :showAuthor="false"
                        />
                    </div>

                    <div class="card-body">
                        <p v-if="0 === collections.length" class="text-body-secondary">{{ $t('puzzles.collections.none') }}</p>

                        <router-link
                            :to="{ name: 'puzzle-collection-create' }"
                            class="btn btn-sm btn-outline-success"
                        ><IconPlus /> {{ $t('puzzles.collections.create') }}</router-link>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
