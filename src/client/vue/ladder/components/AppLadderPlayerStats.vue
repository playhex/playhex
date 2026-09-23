<script setup lang="ts">
import { computed, PropType } from 'vue';
import { formatDistanceToNowStrict } from 'date-fns';
import { LadderPlayer } from '../../../../shared/app/models/index.js';
import { defaultLadderRulesConfig, getCoolingDownEnd, getInactivityRemovalDate } from '../../../../shared/app/ladder/ladderRules.js';

const props = defineProps({
    ladderPlayer: {
        type: Object as PropType<LadderPlayer>,
        required: true,
    },
    strikes: {
        type: Number,
        required: true,
    },
    runningChallengesCount: {
        type: Number,
        required: true,
    },
});

const coolingDownEnd = computed((): null | Date => getCoolingDownEnd(props.ladderPlayer));
const isFuture = (date: null | Date): boolean => date !== null && date.getTime() > Date.now();
</script>

<template>
    <dl class="row small mb-0">
        <dt class="col-7 fw-normal text-secondary">{{ $t('ladder.stats.joined') }}</dt>
        <dd class="col-5">{{ formatDistanceToNowStrict(ladderPlayer.joinedAt, { addSuffix: true }) }}</dd>

        <dt class="col-7 fw-normal text-secondary">{{ $t('ladder.stats.last_game') }}</dt>
        <dd class="col-5">{{ ladderPlayer.lastGameEndedAt ? formatDistanceToNowStrict(ladderPlayer.lastGameEndedAt, { addSuffix: true }) : $t('ladder.stats.never') }}</dd>

        <dt class="col-7 fw-normal text-secondary">{{ $t('ladder.stats.defense_streak') }}</dt>
        <dd class="col-5">{{ ladderPlayer.currentDefenseStreak }} / {{ ladderPlayer.bestDefenseStreak }}</dd>

        <dt class="col-7 fw-normal text-secondary">{{ $t('ladder.stats.challenge_win_streak') }}</dt>
        <dd class="col-5">{{ ladderPlayer.consecutiveChallengeWins }}</dd>

        <dt class="col-7 fw-normal text-secondary">{{ $t('ladder.title_name.giant_slayer') }}</dt>
        <dd class="col-5">{{ ladderPlayer.giantSlayerCount }}</dd>

        <dt class="col-7 fw-normal text-secondary">{{ $t('ladder.title_name.climber') }}</dt>
        <dd class="col-5">{{ ladderPlayer.climberCount }}</dd>

        <dt class="col-7 fw-normal text-secondary">{{ $t('ladder.stats.strikes') }}</dt>
        <dd class="col-5" :class="strikes > 0 ? 'text-warning' : ''">{{ strikes }} / {{ defaultLadderRulesConfig.strikesToRemove }}</dd>

        <template v-if="isFuture(coolingDownEnd)">
            <dt class="col-7 fw-normal text-secondary">{{ $t('ladder.stats.challengeable_again') }}</dt>
            <dd class="col-5">{{ formatDistanceToNowStrict(coolingDownEnd!, { addSuffix: true }) }}</dd>
        </template>

        <template v-if="runningChallengesCount === 0">
            <dt class="col-7 fw-normal text-secondary">{{ $t('ladder.stats.inactivity_removal') }}</dt>
            <dd class="col-5">{{ formatDistanceToNowStrict(getInactivityRemovalDate(ladderPlayer), { addSuffix: true }) }}</dd>
        </template>
    </dl>
</template>
