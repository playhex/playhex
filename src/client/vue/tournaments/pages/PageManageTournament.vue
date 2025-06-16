<script setup lang="ts">
import { computed, ref } from 'vue';
import i18next from 'i18next';
import { apiDeleteTournamentBannedPlayer, apiDeleteTournamentSubscription, apiGetTournamentBannedPlayers, apiPatchTournament, apiPostIterateTournament, apiPostStartTournament, apiPutTournamentBannedPlayer } from '../../../apiClient.js';
import { useTournamentFromUrl } from '../composables/tournamentFromUrl.js';
import TournamentBannedPlayer from '../../../../shared/app/models/TournamentBannedPlayer.js';
import Player from '../../../../shared/app/models/Player.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';
import useToastsStore from '../../../stores/toastsStore.js';
import { Toast } from '../../../../shared/app/Toast.js';
import { useHead } from '@unhead/vue';
import TournamentSubscription from '../../../../shared/app/models/TournamentSubscription.js';

const {
    tournament,
    slug,
    iAmHost,
} = useTournamentFromUrl();

useHead({
    title: () => (false === tournament.value ? null : tournament.value?.title) ?? 'Manage tournament',
});

/**
 * Convert startAt Date to "datetime-local" input format (e.g "2025-04-01T22:00")
 */
const startsAtDatetimeLocal = computed<string>({
    get(): string
    {
        if (!tournament.value) {
            return '';
        }

        return tournament.value.startOfficialAt.toLocaleString('sv').replace(' ', 'T').substring(0, 16);
    },

    set(newValue: string): void
    {
        if (!tournament.value) {
            return;
        }

        tournament.value.startOfficialAt = new Date(newValue + ':00');
    },
});

const editTournament = async () => {
    if (!tournament.value) {
        return;
    }

    await apiPatchTournament(tournament.value);
};

const iterateTournament = async () => {
    await apiPostIterateTournament(slug);
};

const startTournament = async () => {
    try {
        await apiPostStartTournament(slug);
    } catch (e) {
        if (e instanceof DomainHttpError) {
            if ('tournament_not_enough_participants_to_start' === e.type) {
                useToastsStore().addToast(new Toast(
                    i18next.t(e.type),
                    {
                        level: 'danger',
                        autoCloseAfter: 6000,
                    },
                ));

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

(async () => {
    tournamentBannedPlayers.value = await apiGetTournamentBannedPlayers(slug);
})();

const banPlayer = async (player: Player): Promise<void> => {
    const tournamentBannedPlayer = await apiPutTournamentBannedPlayer(slug, player);

    if (null === tournamentBannedPlayers.value) {
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

    if (null !== tournamentBannedPlayers.value) {
        tournamentBannedPlayers.value = tournamentBannedPlayers.value
            .filter(bannedPlayer => bannedPlayer.player.publicId !== player.publicId)
        ;
    }

};
</script>

<template>
    <div class="container my-3">
        <router-link
            :to="{ name: 'tournament', params: { slug }}"
            class="btn btn-outline-primary float-end"
        >
            Back
        </router-link>

        <h1>Manage tournament <span v-if="tournament">{{ tournament.title }}</span></h1>

        <template v-if="tournament && 'created' === tournament.state">
            <h2>Edit</h2>

            <p v-if="false === iAmHost()" class="text-warning">Tournament can be edited by host only.</p>

            <form v-if="tournament" @submit.prevent="editTournament">
                <div class="mb-3">
                    <label for="name" class="form-label">Tournament name</label>
                    <input
                        v-model="tournament.title"
                        type="text"
                        class="form-control form-control-lg"
                        id="name"
                    >
                </div>

                <div class="mb-3">
                    <label for="startDate" class="form-label">Start date</label>
                    <input
                        type="datetime-local"
                        class="form-control form-control-lg"
                        id="startDate"
                        v-model="startsAtDatetimeLocal"
                    >
                </div>

                <h3>Description, rules</h3>

                <textarea
                    v-model="tournament.description"
                    class="form-control mb-3"
                    id="tournament-description"
                ></textarea>

                <button type="submit" class="btn btn-success">Submit modifications</button>
            </form>
        </template>

        <template v-if="tournament && 'created' === tournament.state">
            <h2>Subscribers</h2>

            <ul>
                <li
                    v-for="subscription in tournament.subscriptions"
                    :key="subscription.player.publicId"
                >
                    <button @click="kickPlayer(subscription)" class="btn btn-sm btn-outline-warning me-2">Kick</button>
                    <button @click="banPlayer(subscription.player)" class="btn btn-sm btn-outline-danger me-2">Kick & Ban</button>
                    {{ subscription.player.pseudo }}
                    <span v-if="subscription.checkedIn">(checked-in)</span>
                </li>
            </ul>
        </template>

        <h2>Banned players</h2>

        <p v-if="null === tournamentBannedPlayers">{{ $t('loading') }}</p>
        <p v-else-if="0 === tournamentBannedPlayers.length">(none)</p>
        <ul v-else>
            <li
                v-for="tournamentBannedPlayer in tournamentBannedPlayers"
                :key="tournamentBannedPlayer.player.publicId"
            >
                <button @click="unbanPlayer(tournamentBannedPlayer.player)" class="btn btn-sm btn-outline-success me-2">Unban</button>
                {{ tournamentBannedPlayer.player.pseudo }}
            </li>
        </ul>

        <h2>Manual actions</h2>

        <template v-if="tournament && 'created' === tournament.state">
            <button
                @click="startTournament"
                class="btn btn-success"
            >Start tournament now</button>
        </template>

        <br>

        <template v-if="tournament && 'ended' !== tournament.state">
            <button @click="iterateTournament" class="btn btn-warning">Progress now</button>
            <p><small>In case tournament seems stuck (next games not starting), this button should fix it by checking whole tournament state</small></p>
        </template>
    </div>
</template>

<style lang="stylus" scoped>
h2, h3, h4
    margin-top 1.5em
</style>
