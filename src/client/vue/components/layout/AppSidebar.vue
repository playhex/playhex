<script setup lang="ts">
/* eslint-env browser */
import { storeToRefs } from 'pinia';
import useOnlinePlayersStore from '@client/stores/onlinePlayersStore';
import { BIconCircleFill } from 'bootstrap-icons-vue';
import AppPseudo from '../AppPseudo.vue';

const {
    players,
    totalPlayers,
} = storeToRefs(useOnlinePlayersStore());
</script>

<template>
    <div>
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
