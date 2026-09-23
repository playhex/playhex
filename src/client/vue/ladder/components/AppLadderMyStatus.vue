<script setup lang="ts">
import { computed, PropType, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { defineOverlay } from '@overlastic/vue';
import { formatDistanceToNowStrict } from 'date-fns';
import { t } from 'i18next';
import { Ladder, LadderChallenge } from '../../../../shared/app/models/index.js';
import { LadderMeDto } from '../../../../shared/app/models/LadderDto.js';
import { defaultLadderRulesConfig, getIncomingSlotsChoices, getMinIncomingSlots } from '../../../../shared/app/ladder/ladderRules.js';
import { apiPatchLadderMe, apiPostLadderAnswerLive, apiPostLadderJoin, apiPostLadderLeave } from '../../../apiClient.js';
import useAuthStore from '../../../stores/authStore.js';
import ConfirmationOverlay from '../../components/overlay/ConfirmationOverlay.vue';
import AppLadderSlots from './AppLadderSlots.vue';
import AppLadderPlayerStats from './AppLadderPlayerStats.vue';
import AppLadderTitles from './AppLadderTitles.vue';
import { IconExclamationTriangleFill } from '../../icons.js';
import { useRouter } from 'vue-router';

const props = defineProps({
    ladder: {
        type: Object as PropType<Ladder>,
        required: true,
    },
    me: {
        type: Object as PropType<null | LadderMeDto>,
        default: null,
    },
});

const emit = defineEmits<{
    changed: [];
}>();

const router = useRouter();
const { loggedInPlayer } = storeToRefs(useAuthStore());
const confirmationOverlay = defineOverlay(ConfirmationOverlay);
const loading = ref(false);

const isMember = computed(() => props.me?.ladderPlayer?.state === 'active');
const position = computed(() => props.me?.ladderPlayer?.position ?? null);

const incomingSlotsChoices = computed((): number[] => position.value === null
    ? []
    : getIncomingSlotsChoices(position.value),
);

const myOutgoingChallenges = computed((): LadderChallenge[] => (props.me?.runningChallenges ?? [])
    .filter(c => c.challenger.publicId === loggedInPlayer.value?.publicId),
);

const myIncomingChallenges = computed((): LadderChallenge[] => (props.me?.runningChallenges ?? [])
    .filter(c => c.defender.publicId === loggedInPlayer.value?.publicId),
);

const run = async (action: () => Promise<unknown>): Promise<void> => {
    loading.value = true;

    try {
        await action();
        emit('changed');
    } finally {
        loading.value = false;
    }
};

const join = () => run(() => apiPostLadderJoin(props.ladder.slug));

const leave = async () => {
    try {
        await confirmationOverlay({
            message: t('ladder.leave_confirm'),
            confirmLabel: t('ladder.leave'),
            confirmClass: 'btn-danger',
            cancelLabel: t('cancel'),
        });
    } catch (e) {
        return;
    }

    await run(() => apiPostLadderLeave(props.ladder.slug));
};

const setIncomingSlots = (incomingSlots: number) => run(() => apiPatchLadderMe(props.ladder.slug, incomingSlots));

const answerLive = async (challenge: LadderChallenge, accept: boolean) => {
    loading.value = true;

    try {
        const answered = await apiPostLadderAnswerLive(challenge.publicId, accept);

        if (answered.game) {
            await router.push({ name: 'online-game', params: { gameId: answered.game.publicId } });
            return;
        }

        emit('changed');
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="card mb-3">
        <div class="card-body">

            <!-- Not logged in, or guest -->
            <p v-if="!loggedInPlayer || loggedInPlayer.isGuest" class="m-0">
                <router-link :to="{ name: 'login' }">{{ $t('ladder.log_in_to_join') }}</router-link>
            </p>

            <template v-else-if="me">

                <!-- Not a member -->
                <template v-if="!isMember">
                    <p>{{ $t('ladder.not_in_ladder') }}</p>

                    <p v-if="me.joinRefusal" class="text-warning">
                        {{ $t(`ladder.refusal.${me.joinRefusal}`) }}
                        <template v-if="me.joinRefusal === 'account_too_recent'">
                            {{ $t('ladder.account_age', { count: me.accountAgeDays }) }}
                        </template>
                        <template v-if="me.joinRefusal === 'rejoin_too_early' && me.ladderPlayer?.rejoinableAt">
                            {{ $t('ladder.rejoinable_at', { date: formatDistanceToNowStrict(me.ladderPlayer.rejoinableAt, { addSuffix: true }) }) }}
                        </template>
                    </p>

                    <button v-else type="button" class="btn btn-success" :disabled="loading" @click="join()">{{ $t('ladder.join') }}</button>
                </template>

                <!-- Member -->
                <template v-else-if="me.ladderPlayer && position !== null">
                    <h4>{{ $t('ladder.your_position', { position }) }}</h4>

                    <p class="mb-2"><AppLadderTitles :ladderPlayer="me.ladderPlayer" /></p>

                    <div v-if="me.strikes > 0" class="alert alert-warning">
                        <IconExclamationTriangleFill /> {{ $t('ladder.strikes', { count: me.strikes }) }}
                        <br>
                        <small>{{ $t('ladder.strike_warning') }}</small>
                    </div>

                    <!-- Outgoing slots -->
                    <h6>{{ $t('ladder.outgoing_slots', { used: me.outgoingUsed, total: me.outgoingTotal }) }}</h6>
                    <p v-if="position === 1 && myOutgoingChallenges.length === 0" class="small text-secondary">{{ $t('ladder.nobody_to_challenge') }}</p>
                    <AppLadderSlots v-else :player="me.ladderPlayer.player" :challenges="myOutgoingChallenges" :total="me.outgoingTotal" :seatsIfWon="me.seatsIfWon" />

                    <!-- Incoming slots -->
                    <div class="mb-2">
                        <label class="form-label small mb-1" for="ladder-incoming-slots">{{ $t('ladder.incoming_slots_setting') }}</label>
                        <div class="d-flex align-items-center gap-2">
                            <select
                                :value="me.incomingTotal"
                                class="form-select form-select-sm w-auto"
                                id="ladder-incoming-slots"
                                :disabled="loading"
                                @change="e => setIncomingSlots(parseInt((e.target as HTMLSelectElement).value, 10))"
                            >
                                <option v-for="choice in incomingSlotsChoices" :key="choice" :value="choice">{{ choice }}</option>
                            </select>
                            <small class="text-secondary">{{ $t('ladder.incoming_slots_help', { min: getMinIncomingSlots(position), max: defaultLadderRulesConfig.maxIncomingSlots }) }}</small>
                        </div>
                    </div>

                    <h6>{{ $t('ladder.incoming_slots', { used: me.incomingUsed, total: me.incomingTotal }) }}</h6>
                    <AppLadderSlots :player="me.ladderPlayer.player" :challenges="myIncomingChallenges" :total="me.incomingTotal" :seatsIfWon="me.seatsIfWon" :loading @answerLive="answerLive" />

                    <!-- My stats -->
                    <hr>
                    <h6>{{ $t('ladder.stats.title') }}</h6>
                    <AppLadderPlayerStats :ladderPlayer="me.ladderPlayer" :strikes="me.strikes" :runningChallengesCount="me.runningChallenges.length" />
                </template>

                <template v-if="isMember">
                    <hr>
                    <button type="button" class="btn btn-sm btn-outline-danger" :disabled="loading" @click="leave()">{{ $t('ladder.leave') }}</button>
                </template>
            </template>
        </div>
    </div>
</template>
