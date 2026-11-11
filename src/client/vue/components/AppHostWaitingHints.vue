<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import i18next from 'i18next';
import useOnlinePlayersStore from '../../stores/onlinePlayersStore.js';
import Rooms from '../../../shared/app/Rooms.js';
import { useSocketRoom } from '../composables/useSocketRoom.js';
import { apiGetLobbyJoinChances, type LobbyJoinChances } from '../../apiClient.js';
import { IconCircleFill, IconHourglass } from '../icons.js';

/*
 * Shown to a host waiting for an opponent to join his live game,
 * to let him know his chances to be joined, and avoid canceling too early.
 */

const props = defineProps<{
    /**
     * When the game has been created, to know how long host has been waiting.
     */
    createdAt: Date;
}>();

const FIRST_MINUTE_MS = 60 * 1000;

useSocketRoom(Rooms.onlinePlayersCount);

const { activePlayersCount } = storeToRefs(useOnlinePlayersStore());

const joinChancesByUtcHour = ref<null | LobbyJoinChances[]>(null);

/*
 * Chances depend on when game has been created,
 * and switch to "next minutes" chances once first minute passed.
 */
const firstMinutePassed = ref(Date.now() - props.createdAt.getTime() >= FIRST_MINUTE_MS);
let firstMinuteTimeout: null | ReturnType<typeof setTimeout> = null;

onMounted(async () => {
    if (!firstMinutePassed.value) {
        firstMinuteTimeout = setTimeout(
            () => firstMinutePassed.value = true,
            FIRST_MINUTE_MS - (Date.now() - props.createdAt.getTime()),
        );
    }

    try {
        joinChancesByUtcHour.value = (await apiGetLobbyJoinChances()).joinChancesByUtcHour;
    } catch {
        // Hints are optional, display nothing
    }
});

onUnmounted(() => {
    if (firstMinuteTimeout !== null) {
        clearTimeout(firstMinuteTimeout);
    }
});

const joinChances = computed((): null | LobbyJoinChances => joinChancesByUtcHour.value?.[props.createdAt.getUTCHours()] ?? null);

const hint = computed((): null | { key: string, percent: string } => {
    const percent = firstMinutePassed.value
        ? joinChances.value?.nextTenMinutes
        : joinChances.value?.firstMinute;

    if (percent === null || percent === undefined) {
        return null;
    }

    return {
        key: firstMinutePassed.value ? 'host_waiting_join_chance_next_minutes' : 'host_waiting_join_chance_first_minute',
        percent: new Intl.NumberFormat(i18next.resolvedLanguage, { style: 'percent' }).format(percent / 100),
    };
});
</script>

<template>
    <div class="host-waiting-hints small text-center">
        <p v-if="null !== hint" class="mb-1">
            <IconHourglass />
            {{ ' ' + $t(hint.key, { percent: hint.percent }) }}
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
