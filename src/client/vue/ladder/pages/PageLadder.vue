<script setup lang="ts">
import { playerGender } from '../../../../shared/app/playerPronouns.js';
import useAuthStore from '../../../stores/authStore.js';
import { onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { Player } from '../../../../shared/app/models/index.js';
import { useLadderFromUrl } from '../composables/ladderFromUrl.js';
import { useLadderChallenge } from '../composables/ladderChallenge.js';
import AppLadderKing from '../components/AppLadderKing.vue';
import AppLadderMyStatus from '../components/AppLadderMyStatus.vue';
import AppLadderStandings from '../components/AppLadderStandings.vue';
import AppLadderRunningChallenges from '../components/AppLadderRunningChallenges.vue';
import AppLadderHistory from '../components/AppLadderHistory.vue';
import AppLadderHallOfFame from '../components/AppLadderHallOfFame.vue';
import AppLadderEndedChallenges from '../components/AppLadderEndedChallenges.vue';
import AppChannel from '../../components/AppChannel.vue';
import { IconChatRightText, IconClockHistory, IconCrown, IconFlagCheckered, IconInfoCircle, IconListOl, IconTablerSwords, IconTrophyFill } from '../../icons.js';

const { slug, ladderDto, me, reload, leaderGender } = useLadderFromUrl();

useHead({
    title: () => t('ladder.title', { context: leaderGender.value }),
});

const { challenge } = useLadderChallenge();

type Tab = 'standings' | 'hall_of_fame' | 'running_games' | 'ended_games' | 'chat' | 'history';

const tab = ref<Tab>('standings');

const chatUnseenCount = ref(0);

// Keep "new messages" line while reading, mark seen when leaving chat tab
const channel = useTemplateRef('channel');

watch(tab, (_, previousTab) => {
    if (previousTab === 'chat') {
        channel.value?.markSeen();
    }
});

onBeforeUnmount(() => {
    if (tab.value === 'chat') {
        channel.value?.markSeen();
    }
});

const onChallenge = async (defender: Player): Promise<void> => {
    if (!ladderDto.value) {
        return;
    }

    await challenge(ladderDto.value.ladder, defender, () => void reload());
};
</script>

<template>
    <div class="container my-3">
        <h1><IconCrown class="text-warning" /> {{ $t('ladder.title', { context: leaderGender }) }}</h1>
        <p class="lead mb-1">{{ $t('ladder.intro', { context: playerGender(useAuthStore().loggedInPlayer) }) }}</p>
        <p><router-link :to="{ name: 'ladder-rules', params: { slug } }"><IconInfoCircle /> {{ $t('ladder.rules') }}</router-link></p>

        <p v-if="ladderDto === false">{{ $t('ladder.not_found') }}</p>

        <div v-else-if="ladderDto" class="row">
            <div class="col-12 col-lg-8 order-2 order-lg-1">
                <ul class="nav nav-underline nav-ladder border-bottom mb-3">
                    <li class="nav-item d-flex">
                        <a href="#" class="nav-link" :class="{ active: tab === 'standings' }" @click.prevent="tab = 'standings'">
                            <IconListOl /> {{ $t('ladder.standings') }}
                        </a>
                    </li>
                    <li class="nav-item d-flex">
                        <a href="#" class="nav-link" :class="{ active: tab === 'hall_of_fame' }" @click.prevent="tab = 'hall_of_fame'">
                            <IconTrophyFill class="text-warning" /> {{ $t('ladder.hall_of_fame') }}
                        </a>
                    </li>
                    <li class="nav-item d-flex">
                        <a href="#" class="nav-link" :class="{ active: tab === 'running_games' }" @click.prevent="tab = 'running_games'">
                            <IconTablerSwords /> {{ $t('ladder.running_games') }}
                            <span class="badge text-bg-warning ms-1">{{ ladderDto.runningChallenges.length }}</span>
                        </a>
                    </li>
                    <li class="nav-item d-flex">
                        <a href="#" class="nav-link" :class="{ active: tab === 'ended_games' }" @click.prevent="tab = 'ended_games'">
                            <IconFlagCheckered /> {{ $t('ladder.ended_games') }}
                            <span class="badge text-bg-secondary ms-1">{{ ladderDto.endedChallengesCount }}</span>
                        </a>
                    </li>
                    <li class="nav-item d-flex">
                        <a href="#" class="nav-link" :class="{ active: tab === 'chat' }" @click.prevent="tab = 'chat'" :title="$t('chat')" :aria-label="$t('chat')">
                            <IconChatRightText /> <span class="d-none d-xl-inline">{{ $t('chat') }}</span>
                            <span v-if="chatUnseenCount > 0 && tab !== 'chat'" class="badge rounded-pill bg-danger ms-1">{{ chatUnseenCount }}</span>
                        </a>
                    </li>
                    <li class="nav-item d-flex">
                        <a href="#" class="nav-link" :class="{ active: tab === 'history' }" @click.prevent="tab = 'history'" :title="$t('ladder.history')" :aria-label="$t('ladder.history')">
                            <IconClockHistory /> <span class="d-none d-xl-inline">{{ $t('ladder.history') }}</span>
                        </a>
                    </li>
                </ul>

                <AppLadderStandings
                    v-if="tab === 'standings'"
                    :slug
                    :standings="ladderDto.standings"
                    :runningChallenges="ladderDto.runningChallenges"
                    :strikes="ladderDto.strikes"
                    :me
                    @challenge="onChallenge"
                />

                <AppLadderHallOfFame v-else-if="tab === 'hall_of_fame'" :slug />

                <AppLadderRunningChallenges v-else-if="tab === 'running_games'" :challenges="ladderDto.runningChallenges" :featuredGamePublicIds="ladderDto.featuredGamePublicIds" />

                <AppLadderEndedChallenges v-else-if="tab === 'ended_games'" :slug />

                <AppLadderHistory v-else-if="tab === 'history'" :slug />

                <!-- Kept mounted to count unseen messages -->
                <AppChannel v-show="tab === 'chat'" ref="channel" :channels="'kotl-' + ladderDto.ladder.slug" @unseenCount="chatUnseenCount = $event" />
            </div>

            <div class="col-12 col-lg-4 order-1 order-lg-2">
                <AppLadderKing :currentReign="ladderDto.currentReign" />
                <AppLadderMyStatus :ladder="ladderDto.ladder" :me @changed="reload()" />
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.nav-ladder .nav-link
    font-size 0.9rem
</style>
