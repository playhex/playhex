<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import { t } from 'i18next';
import { apiDeleteTournamentBannedPlayer, apiDeleteTournamentSubscription, apiGetTournamentBannedPlayers, apiPatchTournament, apiPostIterateTournament, apiPostStartTournament, apiPutTournamentBannedPlayer, apiCancelTournament, apiPutTournamentAdmins } from '../../../apiClient.js';
import { useTournamentFromUrl } from '../composables/tournamentFromUrl.js';
import TournamentBannedPlayer from '../../../../shared/app/models/TournamentBannedPlayer.js';
import Player from '../../../../shared/app/models/Player.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';
import useToastsStore from '../../../stores/toastsStore.js';
import { useHead } from '@unhead/vue';
import TournamentSubscription from '../../../../shared/app/models/TournamentSubscription.js';
import AppTournamentForm from '../components/AppTournamentForm.vue';
import { ComponentExposed } from 'vue-component-type-helpers';
import { useRouter } from 'vue-router';
import AppPlayerSelectMultiple from '../components/AppPlayerSelectMultiple.vue';
import ConfirmationOverlay from '../../components/overlay/ConfirmationOverlay.vue';
import { defineOverlay } from '@overlastic/vue';

const {
    tournament,
    slug,
    iAmHost,
} = useTournamentFromUrl();

useHead({
    title: () => (tournament.value === false ? null : tournament.value?.title) ?? t('manage_tournament_page.title'),
});

const router = useRouter();
const tournamentForm = useTemplateRef<ComponentExposed<typeof AppTournamentForm>>('tournamentForm');
const confirmationOverlay = defineOverlay(ConfirmationOverlay);

/*
 * Panels
 */
type Panel = 'edit' | 'actions' | 'admins' | 'participants' | 'banned';

const availablePanels = computed<Panel[]>(() => {
    if (!tournament.value) {
        return [];
    }

    const panels: Panel[] = [];

    if (tournament.value.state === 'created') {
        panels.push('edit');
    }

    if (tournament.value.state !== 'ended') {
        panels.push('actions');
    }

    panels.push('admins');

    if (tournament.value.state === 'created') {
        panels.push('participants');
    }

    panels.push('banned');

    return panels;
});

const currentPanel = ref<Panel>('edit');

watch(availablePanels, panels => {
    if (panels.length > 0 && !panels.includes(currentPanel.value)) {
        currentPanel.value = panels[0];
    }
});

/**
 * @returns Number to display in sidebar next to panel label, or null for panels without count.
 */
const panelCount = (panel: Panel): null | number => {
    switch (panel) {
        case 'admins': return selectedAdmins.value.length;
        case 'participants': return tournament.value ? tournament.value.subscriptions.length : null;
        case 'banned': return tournamentBannedPlayers.value?.length ?? null;
        default: return null;
    }
};

const editTournament = async () => {
    if (!tournament.value) {
        return;
    }

    if (!tournamentForm.value) {
        throw new Error('Missing element with ref tournamentForm');
    }

    if (!await tournamentForm.value.validateTournament()) {
        return;
    }

    try {
        const updated = await apiPatchTournament(tournament.value);

        if (updated === null) {
            throw new Error('Error while updating tournament');
        }

        // In case tournament title has been updated, slug has been modified,
        // so redirect organizer to the new tournament url.
        void router.push({
            name: 'tournament',
            params: {
                slug: updated.slug,
            },
        });

        useToastsStore().addToast(
            t('manage_tournament_page.tournament_updated'),
            {
                level: 'success',
            },
        );
    } catch (e) {
        if (e instanceof DomainHttpError) {
            if (e.type === 'tournament_slug_duplicate') {
                useToastsStore().addToast(
                    t('tournament_slug_duplicate'),
                    {
                        level: 'danger',
                    },
                );

                window.scrollTo(0, 0);
                return;
            }
        }

        useToastsStore().addToast(
            t('manage_tournament_page.tournament_update_error'),
            {
                level: 'danger',
            },
        );

        throw e;
    }
};

const iterateTournament = async () => {
    await apiPostIterateTournament(slug);
};

const startTournament = async () => {
    try {
        await confirmationOverlay({
            title: t('manage_tournament_page.start_now'),
            message: t('manage_tournament_page.start_now_confirm'),
            confirmLabel: t('manage_tournament_page.start_now'),
            confirmClass: 'btn-success',
            cancelLabel: t('cancel'),
            cancelClass: 'btn-outline-primary',
        });
    } catch (e) {
        // start canceled
        return;
    }

    try {
        await apiPostStartTournament(slug);
    } catch (e) {
        if (e instanceof DomainHttpError) {
            if (e.type === 'tournament_not_enough_participants_to_start') {
                useToastsStore().addToast(
                    t(e.type),
                    {
                        level: 'danger',
                        autoCloseAfter: 6000,
                    },
                );

                return;
            }
        }

        throw e;
    }
};

const kickPlayer = async (subscription: TournamentSubscription): Promise<void> => {
    await apiDeleteTournamentSubscription(slug, subscription.player.publicId);

    if (tournament.value) {
        tournament.value.subscriptions = tournament.value.subscriptions
            .filter(s => s.player.publicId !== subscription.player.publicId)
        ;
    }
};

/*
 * Banned players
 */
const tournamentBannedPlayers = ref<null | TournamentBannedPlayer[]>(null);

void (async () => {
    tournamentBannedPlayers.value = await apiGetTournamentBannedPlayers(slug);
})();

const banPlayer = async (player: Player): Promise<void> => {
    const tournamentBannedPlayer = await apiPutTournamentBannedPlayer(slug, player);

    if (tournamentBannedPlayers.value === null) {
        return;
    }

    const alreadyListed = tournamentBannedPlayers.value
        .some(bannedPlayer => bannedPlayer.player.publicId === player.publicId)
    ;

    if (!alreadyListed) {
        tournamentBannedPlayers.value.push(tournamentBannedPlayer);
    }

    if (tournament.value) {
        tournament.value.subscriptions = tournament.value.subscriptions
            .filter(subscription => subscription.player.publicId !== player.publicId)
        ;
    }
};

const unbanPlayer = async (player: Player): Promise<void> => {
    await apiDeleteTournamentBannedPlayer(slug, player);

    if (tournamentBannedPlayers.value !== null) {
        tournamentBannedPlayers.value = tournamentBannedPlayers.value
            .filter(bannedPlayer => bannedPlayer.player.publicId !== player.publicId)
        ;
    }

};

/**
 * Cancel tournament
 */
const cancelTournament = async () => {
    try {
        await confirmationOverlay({
            title: t('manage_tournament_page.cancel_tournament'),
            message: t('manage_tournament_page.cancel_tournament_confirm'),
            confirmLabel: t('manage_tournament_page.cancel_tournament'),
            confirmClass: 'btn-danger',
            cancelLabel: t('cancel'),
            cancelClass: 'btn-outline-primary',
        });
    } catch (e) {
        // cancelation canceled
        return;
    }

    await apiCancelTournament(slug);

    useToastsStore().addToast(
        t('manage_tournament_page.tournament_canceled', { slug }),
        {
            level: 'warning',
        },
    );
};

/**
 * Admins
 */
const selectedAdmins = ref<Player[]>([]);

watch(tournament, (newValue, oldValue) => {
    if (!oldValue && newValue) {
        selectedAdmins.value = newValue.admins.map(admin => admin.player);
    }
});

const updateAdmins = async () => {
    const admins = selectedAdmins.value;
    await apiPutTournamentAdmins(slug, admins);

    useToastsStore().addToast(
        t('manage_tournament_page.admins_updated', {
            admins: admins.length === 0
                ? t('manage_tournament_page.no_admin')
                : admins.map(admin => admin.pseudo).join(', ')
            ,
        }),
        {
            level: 'success',
        },
    );
};
</script>

<template>
    <div class="container my-3">
        <router-link
            :to="{ name: 'tournament', params: { slug }}"
            class="btn btn-outline-primary float-end"
        >
            {{ $t('manage_tournament_page.back') }}
        </router-link>

        <h1>{{ $t('manage_tournament_page.title') }} <span v-if="tournament">{{ tournament.title }}</span></h1>

        <p v-if="null === tournament">{{ $t('loading_tournament') }}</p>
        <p v-else-if="false === tournament">{{ $t('tournament_not_found') }}</p>

        <div v-else class="row mt-4">
            <nav class="col-lg-3 mb-3">
                <div class="list-group">
                    <button
                        v-for="panel in availablePanels"
                        :key="panel"
                        type="button"
                        class="list-group-item list-group-item-action"
                        :class="{ active: currentPanel === panel }"
                        @click="currentPanel = panel"
                    >
                        {{ $t(`manage_tournament_page.panel.${panel}`) }}
                        <span v-if="null !== panelCount(panel)" class="badge text-bg-secondary float-end">{{ panelCount(panel) }}</span>
                    </button>
                </div>
            </nav>

            <div class="col-lg-9">

                <!-- Edit tournament -->
                <section v-if="'edit' === currentPanel">
                    <h2>{{ $t('manage_tournament_page.panel.edit') }}</h2>

                    <p v-if="false === iAmHost()" class="text-warning">{{ $t('manage_tournament_page.edit_host_only') }}</p>

                    <form @submit.prevent="editTournament">
                        <AppTournamentForm :tournament ref="tournamentForm" />

                        <button type="submit" class="btn btn-success">{{ $t('manage_tournament_page.submit_modifications') }}</button>
                    </form>
                </section>

                <!-- Admins -->
                <section v-if="'admins' === currentPanel">
                    <h2>{{ $t('tournament_admins') }}</h2>

                    <AppPlayerSelectMultiple
                        v-model="selectedAdmins"
                        :placeholder="$t('manage_tournament_page.add_admins')"
                    />

                    <p>{{ $t('manage_tournament_page.admins_help') }}</p>

                    <button @click="updateAdmins" class="btn btn-success">{{ $t('manage_tournament_page.update_admins') }}</button>
                </section>

                <!-- Participants -->
                <section v-if="'participants' === currentPanel">
                    <h2>{{ $t('manage_tournament_page.panel.participants') }}</h2>

                    <p v-if="0 === tournament.subscriptions.length">{{ $t('manage_tournament_page.none') }}</p>
                    <ul v-else>
                        <li
                            v-for="subscription in tournament.subscriptions"
                            :key="subscription.player.publicId"
                        >
                            <button @click="kickPlayer(subscription)" class="btn btn-sm btn-outline-warning me-2">{{ $t('manage_tournament_page.kick') }}</button>
                            <button @click="banPlayer(subscription.player)" class="btn btn-sm btn-outline-danger me-2">{{ $t('manage_tournament_page.kick_and_ban') }}</button>
                            {{ subscription.player.pseudo }}
                            <span v-if="subscription.checkedIn">({{ $t('tournament_checkedin') }})</span>
                        </li>
                    </ul>
                </section>

                <!-- Banned players -->
                <section v-if="'banned' === currentPanel">
                    <h2>{{ $t('manage_tournament_page.panel.banned') }}</h2>

                    <p v-if="null === tournamentBannedPlayers">{{ $t('loading') }}</p>
                    <p v-else-if="0 === tournamentBannedPlayers.length">{{ $t('manage_tournament_page.none') }}</p>
                    <ul v-else>
                        <li
                            v-for="tournamentBannedPlayer in tournamentBannedPlayers"
                            :key="tournamentBannedPlayer.player.publicId"
                        >
                            <button @click="unbanPlayer(tournamentBannedPlayer.player)" class="btn btn-sm btn-outline-success me-2">{{ $t('manage_tournament_page.unban') }}</button>
                            {{ tournamentBannedPlayer.player.pseudo }}
                        </li>
                    </ul>
                </section>

                <!-- Actions -->
                <section v-if="'actions' === currentPanel">
                    <h2>{{ $t('manage_tournament_page.panel.actions') }}</h2>

                    <template v-if="'created' === tournament.state">
                        <h3>{{ $t('manage_tournament_page.start_now') }}</h3>
                        <p>{{ $t('manage_tournament_page.start_now_help') }}</p>
                        <button @click="startTournament" class="btn btn-success">{{ $t('manage_tournament_page.start_now') }}</button>
                    </template>

                    <h3>{{ $t('manage_tournament_page.progress_now') }}</h3>
                    <p>{{ $t('manage_tournament_page.progress_now_help') }}</p>
                    <button @click="iterateTournament" class="btn btn-warning">{{ $t('manage_tournament_page.progress_now') }}</button>

                    <h3>{{ $t('manage_tournament_page.cancel_tournament') }}</h3>
                    <p>{{ $t('manage_tournament_page.cancel_tournament_help') }}</p>
                    <button @click="cancelTournament" class="btn btn-danger">{{ $t('manage_tournament_page.cancel_tournament') }}</button>
                </section>

            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
h2
    margin-bottom 1em

h3
    margin-top 1.5em
    font-size 1.25rem
</style>
