<script setup lang="ts">
/* eslint-env browser */
import { storeToRefs } from 'pinia';
import useOnlinePlayersStore from '@client/stores/onlinePlayersStore';
import { BIconCircleFill } from 'bootstrap-icons-vue';
import AppPseudo from '../AppPseudo.vue';
import { BIconTrophy } from 'bootstrap-icons-vue';
import { onUnmounted, ref } from 'vue';
import { secondsToTime } from '@shared/app/timeControlUtils';

const {
    players,
    totalPlayers,
} = storeToRefs(useOnlinePlayersStore());

/*
 * Hex Monthly Tournament
 */
const startsInStr = (): string => {
    const seconds = Math.floor((tournamentStarts.getTime() - new Date().getTime()) / 1000);

    return secondsToTime(seconds);
};

const tournamentStarts = new Date('2024-02-19T19:00:00Z');
const tournamentStartsStr = ref(startsInStr());
const started = (): boolean => new Date().getTime() > tournamentStarts.getTime();

if (!started()) {
    const thread = setInterval(() => {
        tournamentStartsStr.value = startsInStr();
    }, 50);

    onUnmounted(() => clearInterval(thread));
}
</script>

<template>
    <div>
        <div class="card card-bg-icon border-warning mb-4">
            <b-icon-trophy style="top: 1rem; right: 0.5rem; font-size: 8rem" class="text-warning" />
            <div class="card-body">
                <h6 class="card-subtitle mb-2 text-body-secondary">Tournament</h6>
                <h4 class="card-title">Hex Monthly 14</h4>
                <p v-if="!started()" class="text-body-secondary">Starts in {{ tournamentStartsStr }}</p>
                <p v-else>Now!</p>
                <a v-if="!started()" href="https://challonge.com/hex_monthly_14" target="_blank" class="btn btn-warning">Register on Challonge</a>
            </div>
        </div>

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
            <app-pseudo :player-data="player" />
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
