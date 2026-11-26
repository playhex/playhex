<script setup lang="ts">
import { computed, PropType } from 'vue';
import { useWindowSize } from '@vueuse/core';
import AppGameThumbnailLobbyLiveCard from '../../components/AppGameThumbnailLobbyLiveCard.vue';
import { formatDistanceToNowStrict } from 'date-fns';
import { LadderChallenge } from '../../../../shared/app/models/index.js';
import AppLadderPositionPseudo from './AppLadderPositionPseudo.vue';
import { IconEye, IconLightningChargeFill } from '../../icons.js';

const props = defineProps({
    challenges: {
        type: Array as PropType<LadderChallenge[]>,
        required: true,
    },
    featuredGamePublicIds: {
        type: Array as PropType<string[]>,
        default: () => [],
    },
});

const { width } = useWindowSize();

const visibleFeaturedGamePublicIds = computed(() => width.value < 576 ? props.featuredGamePublicIds.slice(0, 1) : props.featuredGamePublicIds);
</script>

<template>
    <p v-if="challenges.length === 0" class="text-secondary">{{ $t('ladder.no_running_challenges') }}</p>

    <div v-if="visibleFeaturedGamePublicIds.length > 0" class="row mb-3">
        <div v-for="gamePublicId in visibleFeaturedGamePublicIds" :key="gamePublicId" class="col col-sm-6">
            <AppGameThumbnailLobbyLiveCard :gamePublicId />
        </div>
    </div>

    <ul v-if="challenges.length > 0" class="list-group">
        <li v-for="challenge in challenges" :key="challenge.publicId" class="list-group-item d-flex justify-content-between align-items-center gap-2">
            <span>
                <AppLadderPositionPseudo :player="challenge.challenger" :position="challenge.challengerPositionBefore" />
                <span class="text-secondary mx-1">{{ $t('ladder.vs') }}</span>
                <AppLadderPositionPseudo :player="challenge.defender" :position="challenge.defenderPositionBefore" />
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
