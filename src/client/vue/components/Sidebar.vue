<script setup lang="ts">
/* eslint-env browser */
import { storeToRefs } from 'pinia';
import useOnlinePlayersStore from '@client/stores/onlinePlayersStore';

const {
    players,
    totalPlayers,
} = storeToRefs(useOnlinePlayersStore());
</script>

<template>
    <div class="card card-bg-icon mb-3">
        <i class="bi-chat-dots"></i>
        <div class="card-body">
            <div class="feedback">
                <p class="lead"><a href="https://feedback.alcalyn.app/" target="_blank">Give your feedback on this application!</a></p>
            </div>
        </div>
    </div>
    <div>
        <h3>Online ({{ null === totalPlayers ? '…' : totalPlayers}})</h3>

        <p
            v-for="player in players"
            :key="player.playerData.id"
            class="mb-1"
        >
            <i
                class="bi-circle-fill me-1"
                aria-hidden="true"
                :class="player.connected ? 'text-success' : 'text-secondary'"
            ></i>
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
