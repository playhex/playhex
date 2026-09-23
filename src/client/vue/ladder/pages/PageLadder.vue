<script setup lang="ts">
import { ref } from 'vue';
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
import { IconClockHistory, IconCrown, IconInfoCircle, IconListOl, IconTablerSwords, IconTrophyFill } from '../../icons.js';

useHead({
    title: t('ladder.title'),
});

const { slug, ladderDto, me, reload } = useLadderFromUrl();
const { challenge } = useLadderChallenge();

type Tab = 'standings' | 'running_games' | 'history' | 'hall_of_fame';

const tab = ref<Tab>('standings');

const onChallenge = async (defender: Player): Promise<void> => {
    if (!ladderDto.value) {
        return;
    }

    await challenge(ladderDto.value.ladder, defender, () => void reload());
};
</script>

<template>
    <div class="container my-3">
        <h1><IconCrown class="text-warning" /> {{ $t('ladder.title') }}</h1>
        <p class="lead mb-1">{{ $t('ladder.intro') }}</p>
        <p><router-link :to="{ name: 'ladder-rules', params: { slug } }"><IconInfoCircle /> {{ $t('ladder.rules') }}</router-link></p>

        <p v-if="ladderDto === false">{{ $t('ladder.not_found') }}</p>

        <div v-else-if="ladderDto" class="row">
            <div class="col-12 col-lg-8 order-2 order-lg-1">
                <ul class="nav nav-tabs mb-3">
                    <li class="nav-item">
                        <a href="#" class="nav-link" :class="{ active: tab === 'standings' }" @click.prevent="tab = 'standings'"><IconListOl /> {{ $t('ladder.standings') }}</a>
                    </li>
                    <li class="nav-item">
                        <a href="#" class="nav-link" :class="{ active: tab === 'running_games' }" @click.prevent="tab = 'running_games'">
                            <IconTablerSwords /> {{ $t('ladder.running_games') }}
                            <span class="badge text-bg-secondary">{{ ladderDto.runningChallenges.length }}</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="#" class="nav-link" :class="{ active: tab === 'history' }" @click.prevent="tab = 'history'"><IconClockHistory /> {{ $t('ladder.history') }}</a>
                    </li>
                    <li class="nav-item">
                        <a href="#" class="nav-link" :class="{ active: tab === 'hall_of_fame' }" @click.prevent="tab = 'hall_of_fame'"><IconTrophyFill /> {{ $t('ladder.hall_of_fame') }}</a>
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

                <AppLadderRunningChallenges v-else-if="tab === 'running_games'" :challenges="ladderDto.runningChallenges" />

                <AppLadderHistory v-else-if="tab === 'history'" :slug />

                <AppLadderHallOfFame v-else-if="tab === 'hall_of_fame'" :slug />
            </div>

            <div class="col-12 col-lg-4 order-1 order-lg-2">
                <AppLadderKing :currentReign="ladderDto.currentReign" />
                <AppLadderMyStatus :ladder="ladderDto.ladder" :me @changed="reload()" />
            </div>
        </div>
    </div>
</template>
