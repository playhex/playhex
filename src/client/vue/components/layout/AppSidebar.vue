<script setup lang="ts">
import { storeToRefs } from 'pinia';
import useOnlinePlayersStore from '@client/stores/onlinePlayersStore';
import { BIconCircleFill } from 'bootstrap-icons-vue';
import AppPseudo from '../AppPseudo.vue';
import AppTournamentCard from '../AppTournamentCard.vue';

const {
    players,
    totalPlayers,
} = storeToRefs(useOnlinePlayersStore());

</script>

<template>
    <div>
        <AppTournamentCard
            name="Hex Monthly 19"
            :startDate="new Date('2024-07-20T17:00:00Z')"
            registerLink="https://challonge.com/hex_monthly_19"
        />
        <AppTournamentCard
            name="Hex Monthly 20"
            :startDate="new Date('2024-08-17T17:00:00Z')"
            registerLink="https://challonge.com/hex_monthly_20"
        />
        <AppTournamentCard
            name="Hex Monthly 21"
            :startDate="new Date('2024-09-21T17:00:00Z')"
            registerLink="https://challonge.com/hex_monthly_21"
        />

        <h3>{{ $t('n_online_players', { n: null === totalPlayers ? '…' : totalPlayers }) }}</h3>

        <p
            v-for="player in players"
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
