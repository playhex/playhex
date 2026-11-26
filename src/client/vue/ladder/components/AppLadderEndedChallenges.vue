<script setup lang="ts">
import { computed } from 'vue';
import { formatDistanceToNowStrict } from 'date-fns';
import { LadderChallenge } from '../../../../shared/app/models/index.js';
import { LADDER_PAGE_SIZE } from '../../../../shared/app/models/LadderDto.js';
import { apiGetLadderEndedChallenges } from '../../../apiClient.js';
import { usePaginatedList } from '../../composables/usePaginatedList.js';
import AppLadderPositionPseudo from './AppLadderPositionPseudo.vue';
import { playerGender } from '../../../../shared/app/playerPronouns.js';
import { IconLightningChargeFill } from '../../icons.js';

const props = defineProps({
    slug: {
        type: String,
        required: true,
    },
});

const { items: challenges, hasMore, loading, loadMore } = usePaginatedList(
    page => apiGetLadderEndedChallenges(props.slug, page),
    LADDER_PAGE_SIZE,
    () => props.slug,
);

/**
 * Winner first when decided, else challenger first
 */
const rows = computed(() => challenges.value?.map((challenge: LadderChallenge) => {
    const challenger = { player: challenge.challenger, position: challenge.challengerPositionBefore };
    const defender = { player: challenge.defender, position: challenge.defenderPositionBefore };

    return challenge.result === 'defender_won'
        ? { challenge, first: defender, second: challenger, decided: true }
        : { challenge, first: challenger, second: defender, decided: challenge.result === 'challenger_won' };
}) ?? null);
</script>

<template>
    <p v-if="rows === null" class="text-secondary">…</p>

    <p v-else-if="rows.length === 0" class="text-secondary">{{ $t('ladder.no_last_games') }}</p>

    <template v-else>
        <ul class="list-group">
            <li v-for="{ challenge, first, second, decided } in rows" :key="challenge.publicId" class="list-group-item d-flex align-items-center gap-2">
                <span class="flex-grow-1">
                    <i18next v-if="decided" :translation="$t('ladder.event.challenge_won_no_move', { context: playerGender(first.player), player: '{player}', opponent: '{opponent}' })">
                        <template #player>
                            <AppLadderPositionPseudo v-bind="first" bold class="first-player" />
                        </template>
                        <template #opponent>
                            <AppLadderPositionPseudo v-bind="second" />
                        </template>
                    </i18next>
                    <template v-else>
                        <AppLadderPositionPseudo v-bind="first" class="first-player" />
                        <span class="text-secondary mx-1">{{ $t('ladder.vs') }}</span>
                        <AppLadderPositionPseudo v-bind="second" />
                        <span class="badge text-bg-secondary ms-1">{{ $t('ladder.game_outcome.voided') }}</span>
                    </template>
                    <span v-if="challenge.playedLive" class="badge text-bg-info ms-1"><IconLightningChargeFill /> {{ $t('ladder.live') }}</span>
                </span>

                <small class="text-secondary text-nowrap">{{ formatDistanceToNowStrict(challenge.endedAt ?? challenge.createdAt, { addSuffix: true }) }}</small>

                <router-link
                    v-if="challenge.game"
                    :to="{ name: 'online-game', params: { gameId: challenge.game.publicId } }"
                    class="btn btn-sm btn-outline-secondary text-nowrap"
                >{{ $t('game.review') }}</router-link>
            </li>
        </ul>

        <button v-if="hasMore" type="button" class="btn btn-link" :disabled="loading" @click="loadMore()">{{ $t('ladder.load_more') }}</button>
    </template>
</template>

<style lang="stylus" scoped>
.first-player
    display inline-block
    min-width 10rem
</style>
