<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useConnectionLostPlayOfflineStore } from '../offline-lobby/stores/connectionLostPlayOfflineStore.js';
import { IconPeople, IconRobot, IconTrophy } from '../icons.js';
import { allowRankedBotGames, useCreateGameOverlay } from '../composables/useCreateGameOverlay.js';

const {
    create1v1RankedAndJoinGame,
    create1v1FriendlyAndJoinGame,
    create1vAIRankedAndJoinGame,
    create1vAIFriendlyAndJoinGame,
} = useCreateGameOverlay();

// Display link "Play offline" when lose connection
const { shouldDisplayPlayOffline } = storeToRefs(useConnectionLostPlayOfflineStore());

const btnClassUnlessOffline = (btnClass: string): string => {
    return shouldDisplayPlayOffline.value
        ? 'btn-secondary'
        : btnClass
    ;
};
</script>

<template>
    <div class="play-buttons row mb-4 g-3">
        <div class="col">
            <button type="button" class="btn w-100" :class="btnClassUnlessOffline('btn-warning')" @click="create1v1RankedAndJoinGame()"><IconTrophy class="fs-3" /><br>{{ $t('1v1_ranked.title') }}</button>
        </div>
        <div class="col" v-if="allowRankedBotGames">
            <button type="button" class="btn w-100" :class="btnClassUnlessOffline('btn-warning')" @click="create1vAIRankedAndJoinGame()"><IconRobot class="fs-3" /><br>{{ $t('1vAI_ranked.title') }}</button>
        </div>
        <div class="col">
            <button type="button" class="btn w-100" :class="btnClassUnlessOffline('btn-success')" @click="create1v1FriendlyAndJoinGame()"><IconPeople class="fs-3" /><br>{{ $t('1v1_friendly.title') }}</button>
        </div>
        <div class="col">
            <button type="button" class="btn w-100" :class="btnClassUnlessOffline('btn-primary')" @click="create1vAIFriendlyAndJoinGame()"><IconRobot class="fs-3" /><br>{{ $t('1vAI_friendly.title') }}</button>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.play-buttons
    .btn
        min-height 6em

        @media (min-width: 992px)
            min-height 7em
</style>
