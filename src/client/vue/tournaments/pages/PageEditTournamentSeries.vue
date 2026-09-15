<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { defineOverlay } from '@overlastic/vue';
import type { ComponentExposed } from 'vue-component-type-helpers';
import { apiDeleteTournamentSeries, apiPatchTournamentSeries, apiPutTournamentSeriesAdmins } from '../../../apiClient.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';
import TournamentSeries from '../../../../shared/app/models/TournamentSeries.js';
import Player from '../../../../shared/app/models/Player.js';
import AppTournamentSeriesForm from '../components/AppTournamentSeriesForm.vue';
import AppPlayerSelectMultiple from '../components/AppPlayerSelectMultiple.vue';
import AppBreadcrumb from '../../components/AppBreadcrumb.vue';
import ConfirmationOverlay from '../../components/overlay/ConfirmationOverlay.vue';
import { tournamentSeriesBreadcrumb } from '../composables/tournamentBreadcrumb.js';
import { useTournamentSeriesFromUrl } from '../composables/tournamentSeriesFromUrl.js';
import useToastsStore from '../../../stores/toastsStore.js';

const {
    slug,
    tournamentSeries,
    iAmHost,
} = useTournamentSeriesFromUrl();

useHead({
    title: () => t('tournament_series_manage_page.title'),
});

const router = useRouter();
const seriesForm = useTemplateRef<ComponentExposed<typeof AppTournamentSeriesForm>>('seriesForm');
const confirmationOverlay = defineOverlay(ConfirmationOverlay);

type Panel = 'edit' | 'admins' | 'delete';

const panels: Panel[] = ['edit', 'admins', 'delete'];
const currentPanel = ref<Panel>('edit');

/**
 * Editable copy, filled once series is loaded.
 */
const editedSeries = ref<null | TournamentSeries>(null);
const selectedAdmins = ref<Player[]>([]);

watch(tournamentSeries, dto => {
    if (!dto) {
        return;
    }

    const series = new TournamentSeries();

    series.publicId = dto.publicId;
    series.title = dto.title;
    series.slug = dto.slug;
    series.description = dto.description;
    series.titlePattern = dto.titlePattern ?? '';

    editedSeries.value = series;

    selectedAdmins.value = dto.admins.map(admin => {
        const player = new Player();

        player.publicId = admin.publicId;
        player.pseudo = admin.pseudo;

        return player;
    });
}, { immediate: true });

const editTournamentSeries = async (): Promise<void> => {
    if (!editedSeries.value || !seriesForm.value) {
        return;
    }

    if (!await seriesForm.value.validateTournamentSeries()) {
        return;
    }

    try {
        const updated = await apiPatchTournamentSeries(editedSeries.value.publicId, editedSeries.value);

        useToastsStore().addToast(t('tournament_series_manage_page.updated'), { level: 'success' });

        void router.push({
            name: 'tournament-series-show',
            params: { slug: updated.slug },
        });
    } catch (e) {
        if (e instanceof DomainHttpError && e.type === 'tournament_series_slug_duplicate') {
            useToastsStore().addToast(t('tournament_series_slug_duplicate'), { level: 'danger' });
            window.scrollTo(0, 0);
            return;
        }

        useToastsStore().addToast(t('tournament_series_manage_page.update_error'), { level: 'danger' });

        throw e;
    }
};

const updateAdmins = async (): Promise<void> => {
    try {
        await apiPutTournamentSeriesAdmins(slug, selectedAdmins.value);
    } catch (e) {
        useToastsStore().addToast(t('tournament_series_manage_page.admins_update_error'), { level: 'danger' });

        throw e;
    }

    useToastsStore().addToast(t('tournament_series_manage_page.admins_updated'), { level: 'success' });
};

const deleteTournamentSeries = async (): Promise<void> => {
    try {
        await confirmationOverlay({
            title: t('tournament_series_manage_page.delete'),
            message: t('tournament_series_manage_page.delete_confirm'),
            confirmLabel: t('tournament_series_manage_page.delete'),
            confirmClass: 'btn-danger',
            cancelLabel: t('cancel'),
            cancelClass: 'btn-outline-primary',
        });
    } catch (e) {
        // deletion canceled
        return;
    }

    try {
        await apiDeleteTournamentSeries(slug);
    } catch (e) {
        if (e instanceof DomainHttpError && e.type === 'tournament_series_has_tournaments') {
            useToastsStore().addToast(t('tournament_series_has_tournaments'), { level: 'danger', autoCloseAfter: 6000 });
            return;
        }

        throw e;
    }

    useToastsStore().addToast(t('tournament_series_manage_page.deleted'), { level: 'warning' });

    void router.push({ name: 'tournament-series' });
};
</script>

<template>
    <div class="container my-3">
        <AppBreadcrumb
            v-if="tournamentSeries"
            :items="[
                ...tournamentSeriesBreadcrumb(tournamentSeries.title).slice(0, -1),
                { label: tournamentSeries.title, to: { name: 'tournament-series-show', params: { slug } } },
                { label: $t('tournament_series_manage_page.title') },
            ]"
        />

        <h1>{{ $t('tournament_series_manage_page.title') }} <span v-if="tournamentSeries">{{ tournamentSeries.title }}</span></h1>

        <p v-if="null === tournamentSeries">{{ $t('tournament_series_list_page.loading') }}</p>
        <p v-else-if="false === tournamentSeries">{{ $t('tournament_series_page.not_found') }}</p>
        <p v-else-if="!iAmHost()" class="text-warning">{{ $t('tournament_series_manage_page.host_only') }}</p>

        <div v-else-if="editedSeries" class="row mt-4">
            <nav class="col-lg-3 mb-3">
                <div class="list-group">
                    <button
                        v-for="panel in panels"
                        :key="panel"
                        type="button"
                        class="list-group-item list-group-item-action"
                        :class="{ active: currentPanel === panel }"
                        @click="currentPanel = panel"
                    >
                        {{ $t(`tournament_series_manage_page.panel.${panel}`) }}
                    </button>
                </div>
            </nav>

            <div class="col-lg-9">

                <!-- Edit -->
                <section v-if="'edit' === currentPanel">
                    <h2>{{ $t('tournament_series_manage_page.panel.edit') }}</h2>

                    <form @submit.prevent="editTournamentSeries">
                        <AppTournamentSeriesForm
                            :tournamentSeries="editedSeries"
                            validationGroup="tournamentSeries:edit"
                            ref="seriesForm"
                        />

                        <button type="submit" class="btn btn-success">{{ $t('tournament_series_form.submit_edit') }}</button>
                    </form>
                </section>

                <!-- Admins -->
                <section v-if="'admins' === currentPanel">
                    <h2>{{ $t('tournament_series_admins') }}</h2>

                    <AppPlayerSelectMultiple
                        v-model="selectedAdmins"
                        :placeholder="$t('tournament_series_manage_page.add_admins')"
                    />

                    <p>{{ $t('tournament_series_admins_help') }}</p>

                    <button @click="updateAdmins" class="btn btn-success">{{ $t('tournament_series_manage_page.update_admins') }}</button>
                </section>

                <!-- Delete -->
                <section v-if="'delete' === currentPanel">
                    <h2>{{ $t('tournament_series_manage_page.delete') }}</h2>

                    <p>{{ $t('tournament_series_manage_page.delete_help') }}</p>

                    <button @click="deleteTournamentSeries" class="btn btn-danger">{{ $t('tournament_series_manage_page.delete') }}</button>
                </section>

            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
h2
    margin-bottom 1em
</style>
