<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import useOnlinePlayersStore from '@client/stores/onlinePlayersStore';
import { BIconCircleFill } from 'bootstrap-icons-vue';
import AppPseudo from '../AppPseudo.vue';
import AppTournamentCard from '../AppTournamentCard.vue';
import AppTournamentPlayOk from '../AppTournamentPlayOk.vue';
import type { Player } from '@shared/app/models';

const {
    players,
    totalPlayers,
} = storeToRefs(useOnlinePlayersStore());

const orderedPlayers = computed<Player[]>(() => {
    return Object.values<Player>(players.value)
        .sort((a, b) => {
            // Guests go after non-guests
            if (!a.isGuest && b.isGuest) return -1;
            if (a.isGuest && !b.isGuest) return 1;
            return a.pseudo.localeCompare(b.pseudo);
        });
});

</script>

<template>
    <div>
        <AppTournamentPlayOk
            name="PlayOk"
            :startDate="new Date('2024-09-27T18:00:00Z')"
        />
        <AppTournamentCard
            name="Hex Monthly 22"
            :startDate="new Date('2024-10-19T17:00:00Z')"
            registerLink="https://challonge.com/hex_monthly_22"
        />
        <AppTournamentCard
            name="Hex Monthly 23"
            :startDate="new Date('2024-11-16T17:00:00Z')"
            registerLink="https://challonge.com/hex_monthly_23"
        />

        <h3>{{ $t('n_online_players', { n: null === totalPlayers ? '…' : totalPlayers }) }}</h3>

        <p
            v-for="player in orderedPlayers"
            :key="player.publicId"
            class="mb-1"
        >
            <BIconCircleFill
                class="online-status-icon text-success"
                aria-hidden="true"
            />
            <AppPseudo rating :player="player" />
        </p>
    </div>
</template>

<style lang="stylus" scoped>
.feedback
    height 8em
    display flex
    justify-content center
    text-align center

    i::before
        vertical-align 0

    p
        display flex
        flex-flow column
        justify-content center
        z-index 5
        margin 0
</style>
