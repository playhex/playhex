<script setup lang="ts">
import { useDisclosure } from '@overlastic/vue';
import { computed, PropType, ref, watchEffect } from 'vue';
import { storeToRefs } from 'pinia';
import { Ladder, Player } from '../../../../shared/app/models/index.js';
import AppBoardsize from '../../components/overlay/create-game/AppBoardsize.vue';
import TimeControlType from '../../../../shared/time-control/TimeControlType.js';
import { defaultTimeControlTypes, isSameTimeControlType, timeControlToString } from '../../../../shared/app/timeControlUtils.js';
import usePlayerFavoriteTimeControlsStore from '../../../stores/playerFavoriteTimeControlsStore.js';
import useOnlinePlayersStore from '../../../stores/onlinePlayersStore.js';
import { pseudoString } from '../../../../shared/app/pseudoUtils.js';
import { IconTablerSwords } from '../../icons.js';
import type { LadderChallengeOverlayResult } from '../composables/ladderChallenge.js';

const { visible, confirm, cancel } = useDisclosure();

const props = defineProps({
    ladder: {
        type: Object as PropType<Ladder>,
        required: true,
    },
    defender: {
        type: Object as PropType<Player>,
        required: true,
    },
});

const boardsize = ref(Math.min(props.ladder.boardsizeMax, Math.max(props.ladder.boardsizeMin, 13)));

const sizesSelection = computed(() => [11, 13, 14, 17, 19].filter(size => size >= props.ladder.boardsizeMin && size <= props.ladder.boardsizeMax));

const proposeLive = ref(false);

/**
 * Live can be proposed only to an active defender, not only connected or idle.
 * Also checked on server.
 */
const onlinePlayersStore = useOnlinePlayersStore();
const defenderActive = computed(() => onlinePlayersStore.isPlayerActive(props.defender.publicId));

watchEffect(() => {
    if (!defenderActive.value) {
        proposeLive.value = false;
    }
});

const { favoriteTimeControls } = storeToRefs(usePlayerFavoriteTimeControlsStore());

/**
 * Live time controls to choose from: player favorites, and default live presets.
 */
const liveTimeControls = computed((): TimeControlType[] => {
    const timeControls: TimeControlType[] = [];

    for (const timeControl of [
        ...favoriteTimeControls.value.filter(f => f.cadency === 'live').map(f => f.timeControlType),
        defaultTimeControlTypes.fast,
        defaultTimeControlTypes.normal,
        defaultTimeControlTypes.long,
    ]) {
        if (!timeControls.some(t => isSameTimeControlType(t, timeControl))) {
            timeControls.push(timeControl);
        }
    }

    return timeControls;
});

const liveTimeControlIndex = ref(0);

const submit = () => {
    const result: LadderChallengeOverlayResult = {
        boardsize: boardsize.value,
        liveTimeControlType: proposeLive.value ? liveTimeControls.value[liveTimeControlIndex.value] ?? null : null,
    };

    confirm(result);
};
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block">
            <div class="modal-dialog">
                <form class="modal-content" @submit.prevent="submit()">
                    <div class="modal-header">
                        <h5 class="modal-title"><IconTablerSwords /> {{ $t('ladder.challenge_overlay.title', { player: pseudoString(defender) }) }}</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-secondary">{{ $t('ladder.challenge_overlay.intro') }}</p>

                        <div class="mb-3">
                            <AppBoardsize v-model="boardsize" :boardsizeMin="ladder.boardsizeMin" :boardsizeMax="ladder.boardsizeMax" :sizesSelection />
                        </div>

                        <div class="form-check">
                            <input v-model="proposeLive" class="form-check-input" type="checkbox" id="ladder-propose-live" :disabled="!defenderActive">
                            <label class="form-check-label" for="ladder-propose-live">{{ $t('ladder.challenge_overlay.propose_live') }}</label>
                        </div>
                        <p v-if="!defenderActive" class="form-text text-secondary">{{ $t('ladder.challenge_overlay.defender_not_active', { player: pseudoString(defender) }) }}</p>
                        <p v-else class="form-text">{{ $t('ladder.challenge_overlay.propose_live_help') }}</p>

                        <div v-if="proposeLive" class="mb-3">
                            <label class="form-label" for="ladder-live-time-control">{{ $t('ladder.challenge_overlay.live_time_control') }}</label>
                            <select v-model="liveTimeControlIndex" class="form-select" id="ladder-live-time-control">
                                <option v-for="(timeControl, index) in liveTimeControls" :key="index" :value="index">{{ timeControlToString(timeControl) }}</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" @click="cancel()">{{ $t('cancel') }}</button>
                        <button type="submit" class="btn btn-success">{{ $t('ladder.challenge_overlay.submit') }}</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
