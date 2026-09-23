<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import useAuthStore from '../../../stores/authStore.js';
import { t } from 'i18next';
import { formatDistanceToNowStrict } from 'date-fns';
import { LadderEvent } from '../../../../shared/app/models/index.js';
import { apiGetLadderHistory } from '../../../apiClient.js';
import { pseudoString, pseudoStringOptional } from '../../../../shared/app/pseudoUtils.js';
import { IconCrown, IconExclamationTriangleFill, IconEye, IconShieldFill, IconStairsUp, IconSword, IconTablerSwords } from '../../icons.js';

const props = defineProps({
    slug: {
        type: String,
        required: true,
    },
});

const { loggedInPlayer } = storeToRefs(useAuthStore());

const events = ref<null | LadderEvent[]>(null);
const page = ref(0);
const hasMore = ref(true);
const loading = ref(false);

/**
 * Only events where I am player or otherPlayer
 */
const onlyMine = ref(false);

/**
 * Ignore responses of requests sent before filter changed
 */
let requestId = 0;

const loadMore = async (): Promise<void> => {
    const currentRequestId = ++requestId;
    loading.value = true;

    try {
        const nextEvents = await apiGetLadderHistory(
            props.slug,
            page.value,
            onlyMine.value ? loggedInPlayer.value?.publicId ?? null : null,
        );

        if (currentRequestId !== requestId) {
            return;
        }

        events.value = [...(events.value ?? []), ...nextEvents];
        hasMore.value = nextEvents.length > 0;
        ++page.value;
    } finally {
        if (currentRequestId === requestId) {
            loading.value = false;
        }
    }
};

watch(onlyMine, () => {
    events.value = null;
    page.value = 0;
    hasMore.value = true;
    void loadMore();
});

void loadMore();

const eventText = (event: LadderEvent): string => {
    const player = pseudoString(event.player);
    const opponent = pseudoStringOptional(event.otherPlayer);
    const p = event.parameters;

    switch (event.type) {
        case 'challenge_result': {
            if (p.result === 'challenger_won') {
                return p.challengerPositionAfter !== null && p.challengerPositionAfter !== p.challengerPositionBefore
                    ? t('ladder.event.challenge_won', { player, opponent, from: p.challengerPositionBefore, position: p.challengerPositionAfter })
                    : t('ladder.event.challenge_won_no_move', { player, opponent })
                ;
            }

            if (p.result === 'defender_won') {
                return t('ladder.event.challenge_defended', { player, opponent });
            }

            return t('ladder.event.challenge_voided', { player, opponent });
        }

        case 'join': return t('ladder.event.join', { player, position: p.position });
        case 'leave': return t('ladder.event.leave', { player, position: p.position });
        case 'removed_inactive': return t('ladder.event.removed_inactive', { player, position: p.position });
        case 'removed_strikes': return t('ladder.event.removed_strikes', { player, strikes: p.strikes, position: p.position });
        case 'new_king': return t('ladder.event.new_king', { player });
        case 'giant_slayer': return t('ladder.event.giant_slayer', { player, opponent });
        case 'climber': return t('ladder.event.climber', { player, wins: p.wins });
        case 'strike': return t('ladder.event.strike', { player, strikes: p.strikes });
    }
};
</script>

<template>
    <div v-if="loggedInPlayer && !loggedInPlayer.isGuest" class="form-check mb-2">
        <input v-model="onlyMine" class="form-check-input" type="checkbox" id="ladder-history-only-mine">
        <label class="form-check-label" for="ladder-history-only-mine">{{ $t('ladder.history_only_mine') }}</label>
    </div>

    <p v-if="events !== null && events.length === 0" class="text-secondary">{{ $t('ladder.hall.empty') }}</p>

    <ul v-if="events !== null && events.length > 0" class="list-group">
        <li v-for="event in events" :key="event.createdAt.toISOString() + event.type + event.player.publicId" class="list-group-item d-flex justify-content-between align-items-center gap-2">
            <span>
                <IconCrown v-if="event.type === 'new_king'" class="text-warning me-1" />
                <IconSword v-else-if="event.type === 'giant_slayer'" class="text-danger me-1" />
                <IconStairsUp v-else-if="event.type === 'climber'" class="text-success me-1" />
                <IconExclamationTriangleFill v-else-if="event.type === 'strike' || event.type === 'removed_strikes'" class="text-warning me-1" />
                <IconShieldFill v-else-if="event.type === 'challenge_result' && event.parameters.result === 'defender_won'" class="text-primary me-1" />
                <IconTablerSwords v-else-if="event.type === 'challenge_result'" class="me-1" />

                <span :class="{ 'fw-bold': event.type === 'new_king' }">{{ eventText(event) }}</span>
                <small class="text-secondary ms-2">{{ formatDistanceToNowStrict(event.createdAt, { addSuffix: true }) }}</small>
            </span>

            <router-link
                v-if="event.type === 'challenge_result' && event.challenge?.game"
                :to="{ name: 'online-game', params: { gameId: event.challenge.game.publicId } }"
                class="btn btn-sm btn-outline-secondary"
            ><IconEye /></router-link>
        </li>
    </ul>

    <button v-if="hasMore && events !== null && events.length > 0" type="button" class="btn btn-link" :disabled="loading" @click="loadMore()">{{ $t('ladder.load_more') }}</button>
</template>
