<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import useAuthStore from '../../stores/authStore.js';
import { apiGetPlayerModerationActions, apiPatchPlayerModerationActionAcknowledge } from '../../apiClient.js';
import PlayerModerationAction from '../../../shared/app/models/PlayerModerationAction.js';
import AppPlayerModerationActionOverlay from './AppPlayerModerationActionOverlay.vue';

const { loggedInPlayer } = storeToRefs(useAuthStore());

const pendingActions = ref<PlayerModerationAction[]>([]);

watch(loggedInPlayer, async player => {
    if (player === null) {
        pendingActions.value = [];
        return;
    }

    pendingActions.value = await apiGetPlayerModerationActions();
}, { immediate: true });

const acknowledge = async (action: PlayerModerationAction) => {
    await apiPatchPlayerModerationActionAcknowledge(action.publicId);
    pendingActions.value = pendingActions.value.filter(a => a.publicId !== action.publicId);
};
</script>

<template>
    <AppPlayerModerationActionOverlay
        v-for="action in pendingActions"
        :key="action.publicId"
        :action
        @acknowledge="acknowledge(action)"
    />
</template>
