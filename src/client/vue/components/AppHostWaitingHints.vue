<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import i18next from 'i18next';
import useOnlinePlayersStore from '../../stores/onlinePlayersStore.js';
import Rooms from '../../../shared/app/Rooms.js';
import { useSocketRoom } from '../composables/useSocketRoom.js';
import { apiGetLobbyWaitStats } from '../../apiClient.js';
import { IconCircleFill, IconHourglass } from '../icons.js';

/*
 * Shown to a host waiting for an opponent to join his live game,
 * to let him know someone will probably join soon, and avoid canceling too early.
 */

useSocketRoom(Rooms.onlinePlayersCount);

const { activePlayersCount } = storeToRefs(useOnlinePlayersStore());

const typicalJoinMsByUtcHour = ref<null | (null | number)[]>(null);

onMounted(async () => {
    try {
        typicalJoinMsByUtcHour.value = (await apiGetLobbyWaitStats()).typicalJoinMsByUtcHour;
    } catch {
        // Hints are optional, display nothing
    }
});

const typicalJoinMs = computed((): null | number => typicalJoinMsByUtcHour.value?.[new Date().getUTCHours()] ?? null);

/**
 * "25 s" or "2 min", rounded, since it is only an estimation.
 */
const formatApproxDuration = (ms: number): string => {
    const seconds = ms / 1000;

    if (seconds < 60) {
        return new Intl.NumberFormat(i18next.resolvedLanguage, { style: 'unit', unit: 'second', unitDisplay: 'short' })
            .format(Math.max(5, Math.round(seconds / 5) * 5));
    }

    return new Intl.NumberFormat(i18next.resolvedLanguage, { style: 'unit', unit: 'minute', unitDisplay: 'short' })
        .format(Math.round(seconds / 60));
};
</script>

<template>
    <div class="host-waiting-hints small text-center">
        <p v-if="null !== typicalJoinMs" class="mb-1">
            <IconHourglass />
            {{ ' ' + $t('host_waiting_typical_join_time', { duration: formatApproxDuration(typicalJoinMs) }) }}
        </p>
        <p v-if="null !== activePlayersCount" class="mb-0">
            <IconCircleFill class="text-success active-players-icon" />
            {{ ' ' + activePlayersCount + ' ' + $t('lobby_active_players', { count: activePlayersCount }) }}
        </p>
    </div>
</template>

<style lang="stylus" scoped>
.active-players-icon
    font-size 0.65em
</style>
