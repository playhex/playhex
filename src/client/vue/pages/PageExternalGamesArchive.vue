<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { useSeoMeta } from '@unhead/vue';
import { t } from 'i18next';
import { ExternalGame } from '../../../shared/app/models/index.js';
import type SearchExternalGamesParameters from '../../../shared/app/SearchExternalGamesParameters.js';
import { getExternalGames } from '../../apiClient.js';
import { useSearchGamesPagination } from '../composables/searchGamesPagination.js';
import AppExternalGamesTable from '../components/external-games/AppExternalGamesTable.vue';

useSeoMeta({
    title: t('external_games.archive_title'),
});

const DEFAULT_PAGE_SIZE = 20;

const externalGames = ref<null | ExternalGame[]>(null);
const totalResults = ref<null | number>(null);

const searchParameters = ref<SearchExternalGamesParameters>({
    paginationPageSize: DEFAULT_PAGE_SIZE,
    paginationPage: 0,
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
    <div class="container-fluid my-3">
        <h1 class="h2 mb-3">{{ $t('external_games.archive_title') }}</h1>

        <p class="text-body-secondary">{{ $t('external_games.archive_description') }}</p>

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
    </div>
</template>
