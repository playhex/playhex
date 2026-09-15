<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useRouter } from 'vue-router';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import type { ComponentExposed } from 'vue-component-type-helpers';
import { apiPostTournamentSeries } from '../../../apiClient.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';
import { createTournamentSeriesDefaultsCreate } from '../../../../shared/app/models/TournamentSeries.js';
import AppTournamentSeriesForm from '../components/AppTournamentSeriesForm.vue';
import AppBreadcrumb from '../../components/AppBreadcrumb.vue';
import { tournamentSeriesListBreadcrumb } from '../composables/tournamentBreadcrumb.js';
import useToastsStore from '../../../stores/toastsStore.js';

const tournamentSeries = ref(createTournamentSeriesDefaultsCreate());

useHead({
    title: () => tournamentSeries.value.title || t('tournament_series_form.create_title'),
});

const router = useRouter();
const seriesForm = useTemplateRef<ComponentExposed<typeof AppTournamentSeriesForm>>('seriesForm');

const breadcrumbItems = tournamentSeriesListBreadcrumb(t('tournament_series_form.create_title'));

const createTournamentSeries = async (): Promise<void> => {
    if (!seriesForm.value) {
        throw new Error('Missing element with ref seriesForm');
    }

    if (!await seriesForm.value.validateTournamentSeries()) {
        return;
    }

    try {
        const created = await apiPostTournamentSeries(tournamentSeries.value);

        void router.push({
            name: 'tournament-series-show',
            params: { slug: created.slug },
        });

        useToastsStore().addToast(t('tournament_series_form.created'), { level: 'success' });
    } catch (e) {
        if (e instanceof DomainHttpError && e.type === 'tournament_series_slug_duplicate') {
            useToastsStore().addToast(t('tournament_series_slug_duplicate'), { level: 'danger' });
            window.scrollTo(0, 0);
            return;
        }

        useToastsStore().addToast(t('tournament_series_form.create_error'), { level: 'danger' });

        throw e;
    }
};
</script>

<template>
    <div class="container my-3">
        <AppBreadcrumb :items="breadcrumbItems" />

        <h1>{{ $t('tournament_series_form.create_title') }}</h1>

        <p>{{ $t('tournament_series_form.create_intro') }}</p>

        <form @submit.prevent="createTournamentSeries">
            <AppTournamentSeriesForm :tournamentSeries ref="seriesForm" />

            <button type="submit" class="btn btn-success">{{ $t('tournament_series_form.submit_create') }}</button>
        </form>
    </div>
</template>
