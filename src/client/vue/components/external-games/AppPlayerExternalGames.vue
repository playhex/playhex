<script setup lang="ts">
import { ref, toRefs, watch, watchEffect } from 'vue';
import { ExternalGame } from '../../../../shared/app/models/index.js';
import type SearchExternalGamesParameters from '../../../../shared/app/SearchExternalGamesParameters.js';
import { getExternalGames } from '../../../apiClient.js';
import { useSearchGamesPagination } from '../../composables/searchGamesPagination.js';
import AppExternalGamesTable from './AppExternalGamesTable.vue';

/*
 * Games played on an external site by a player, e.g Little Golem.
 */

const props = defineProps({
    /**
     * E.g "LG:2883"
     */
    externalPlayerId: {
        type: String,
        required: true,
    },
});

const { externalPlayerId } = toRefs(props);

const DEFAULT_PAGE_SIZE = 15;

const externalGames = ref<null | ExternalGame[]>(null);
const totalResults = ref<null | number>(null);

const searchParameters = ref<SearchExternalGamesParameters>({
    externalPlayerId: externalPlayerId.value,
    paginationPageSize: DEFAULT_PAGE_SIZE,
    paginationPage: 0,
});

watch(externalPlayerId, () => {
    searchParameters.value.externalPlayerId = externalPlayerId.value;
    searchParameters.value.paginationPage = 0;
});

const { totalPages, goPagePrevious, goPageNext } = useSearchGamesPagination(
    searchParameters,
    totalResults,
    DEFAULT_PAGE_SIZE,
);

watchEffect(async () => {
    const { results, count } = await getExternalGames(searchParameters.value);

    externalGames.value = results;
    totalResults.value = count;
});
</script>

<template>
    <p v-if="null !== totalResults">{{ $t('n_total_games', { count: totalResults }) }}</p>
    <p v-else>…</p>

    <div class="card">
        <div class="card-header d-flex align-items-center gap-2">
            <button @click="goPagePrevious" class="btn btn-sm btn-outline-primary" :class="{ disabled: (searchParameters.paginationPage ?? 0) < 1 }">{{ $t('previous') }}</button>
            <span>{{ $t('page_page_of_max', { page: (searchParameters.paginationPage ?? 0) + 1, max: totalPages }) }}</span>
            <button @click="goPageNext" class="btn btn-sm btn-outline-primary" :class="{ disabled: (searchParameters.paginationPage ?? 0) + 1 >= totalPages }">{{ $t('next') }}</button>
        </div>

        <AppExternalGamesTable v-if="externalGames && externalGames.length > 0" :externalGames />

        <div v-if="externalGames && externalGames.length > 0" class="card-footer d-flex align-items-center gap-2">
            <button @click="goPagePrevious" class="btn btn-sm btn-outline-primary" :class="{ disabled: (searchParameters.paginationPage ?? 0) < 1 }">{{ $t('previous') }}</button>
            <span>{{ $t('page_page_of_max', { page: (searchParameters.paginationPage ?? 0) + 1, max: totalPages }) }}</span>
            <button @click="goPageNext" class="btn btn-sm btn-outline-primary" :class="{ disabled: (searchParameters.paginationPage ?? 0) + 1 >= totalPages }">{{ $t('next') }}</button>
        </div>
    </div>
</template>
