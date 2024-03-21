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
        <app-tournament-card
            name="Hex Monthly 16"
            :start-date="new Date('2024-04-20T17:00:00Z')"
            register-link="https://challonge.com/hex_monthly_16"
        />
        <app-tournament-card
            name="Hex Monthly 17"
            :start-date="new Date('2024-05-18T17:00:00Z')"
            register-link="https://challonge.com/hex_monthly_17"
        />
        <app-tournament-card
            name="Hex Monthly 18"
            :start-date="new Date('2024-06-15T17:00:00Z')"
            register-link="https://challonge.com/hex_monthly_18"
        />

        <h3>Online ({{ null === totalPlayers ? '…' : totalPlayers}})</h3>

        <p
            v-for="player in players"
            :key="player.publicId"
            class="mb-1"
        >
            <b-icon-circle-fill
                class="online-status-icon text-success"
                aria-hidden="true"
            />
            <app-pseudo :player="player" />
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
