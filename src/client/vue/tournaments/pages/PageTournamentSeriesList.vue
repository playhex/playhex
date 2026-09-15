<script setup lang="ts">
import { ref } from 'vue';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { TournamentSeriesListItemDto } from '../../../../shared/app/models/TournamentSeriesDto.js';
import { apiGetTournamentSeriesList } from '../../../apiClient.js';
import { IconPlus } from '../../icons.js';
import AppBreadcrumb from '../../components/AppBreadcrumb.vue';
import AppTournamentSeriesCard from '../components/AppTournamentSeriesCard.vue';
import { tournamentSeriesListBreadcrumb } from '../composables/tournamentBreadcrumb.js';
import useToastsStore from '../../../stores/toastsStore.js';

useHead({
    title: t('tournament_series_list_page.title'),
});

const allSeries = ref<null | TournamentSeriesListItemDto[]>(null);
const seriesLoadError = ref(false);

void (async () => {
    try {
        allSeries.value = await apiGetTournamentSeriesList();
    } catch (e) {
        seriesLoadError.value = true;
        useToastsStore().addToast(t('tournament_series_list_page.load_error'), { level: 'danger' });
    }
})();
</script>

<template>
    <div class="container my-3">
        <AppBreadcrumb :items="tournamentSeriesListBreadcrumb()" />

        <div class="d-flex justify-content-between">
            <h1>{{ $t('tournament_series_list_page.title') }}</h1>

            <div>
                <router-link :to="{ name: 'tournament-series-create' }" class="btn btn-sm btn-outline-success float-end">
                    <IconPlus />
                    {{ $t('tournament_series_list_page.create') }}
                </router-link>
            </div>
        </div>

        <p>{{ $t('tournament_series_list_page.intro') }}</p>

        <p v-if="seriesLoadError" class="text-danger">{{ $t('tournament_series_list_page.load_error') }}</p>

        <p v-else-if="null === allSeries">{{ $t('tournament_series_list_page.loading') }}</p>

        <p v-else-if="0 === allSeries.length"><i>{{ $t('tournament_series_list_page.empty') }}</i></p>

        <div v-else class="row">
            <div
                v-for="tournamentSeries in allSeries"
                :key="tournamentSeries.publicId"
                class="col-12 col-md-6 col-lg-4 mb-3"
            >
                <AppTournamentSeriesCard :tournamentSeries />
            </div>
        </div>
    </div>
</template>
