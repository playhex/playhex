<script setup lang="ts">
/* eslint-env browser */
import { storeToRefs } from 'pinia';
import useOnlinePlayersStore from '@client/stores/onlinePlayersStore';
import { BIconCircleFill } from 'bootstrap-icons-vue';

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
            :key="player.playerData.publicId"
            class="mb-1"
        >
            <b-icon-circle-fill
                class="online-status-icon"
                aria-hidden="true"
                :class="player.connected ? 'text-success' : 'text-secondary'"
            />
            {{ player.playerData.pseudo }}
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
