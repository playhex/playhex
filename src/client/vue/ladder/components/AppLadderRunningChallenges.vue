<script setup lang="ts">
import { PropType } from 'vue';
import { formatDistanceToNowStrict } from 'date-fns';
import { LadderChallenge } from '../../../../shared/app/models/index.js';
import AppPseudo from '../../components/AppPseudo.vue';
import { IconEye, IconLightningChargeFill } from '../../icons.js';

defineProps({
    challenges: {
        type: Array as PropType<LadderChallenge[]>,
        required: true,
    },
});
</script>

<template>
    <p v-if="challenges.length === 0" class="text-secondary">{{ $t('ladder.no_running_challenges') }}</p>

    <ul v-else class="list-group">
        <li v-for="challenge in challenges" :key="challenge.publicId" class="list-group-item d-flex justify-content-between align-items-center gap-2">
            <span>
                <small class="text-secondary me-1">#{{ challenge.challengerPositionBefore }}</small>
                <AppPseudo :player="challenge.challenger" />
                <span class="text-secondary mx-1">{{ $t('ladder.vs') }}</span>
                <small class="text-secondary me-1">#{{ challenge.defenderPositionBefore }}</small>
                <AppPseudo :player="challenge.defender" />
                <span v-if="challenge.playedLive || challenge.state === 'pending_live'" class="badge text-bg-info ms-1"><IconLightningChargeFill /> {{ $t('ladder.live') }}</span>
                <small class="text-secondary ms-1">{{ challenge.boardsize }}×{{ challenge.boardsize }} · {{ formatDistanceToNowStrict(challenge.createdAt, { addSuffix: true }) }}</small>
            </span>

            <router-link
                v-if="challenge.game"
                :to="{ name: 'online-game', params: { gameId: challenge.game.publicId } }"
                class="btn btn-sm btn-outline-primary"
            ><IconEye /></router-link>
        </li>
    </ul>
</template>
