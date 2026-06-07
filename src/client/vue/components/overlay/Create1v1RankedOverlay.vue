<script setup lang="ts">
import { useDisclosure } from '@overlastic/vue';
import { PropType, reactive, toRef, watch } from 'vue';
import { HostedGameOptions } from '../../../../shared/app/models/index.js';
import AppBoardsize from './create-game/AppBoardsize.vue';
import AppTimeControl from '../AppTimeControl.vue';
import { RANKED_BOARDSIZE_MIN, RANKED_BOARDSIZE_MAX } from '../../../../shared/app/ratingUtils.js';
import { IconTrophy } from '../../icons.js';
import TimeControlType from '../../../../shared/time-control/TimeControlType.js';
import AppAllowExploration from './create-game/AppAllowExploration.vue';
import AppOpponentMustBeRegistered from './create-game/AppOpponentMustBeRegistered.vue';
import useLobbyStore from '../../../stores/lobbyStore.js';
import { storeToRefs } from 'pinia';

const { visible, confirm, cancel } = useDisclosure();

const props = defineProps({
    gameOptions: {
        type: Object as PropType<HostedGameOptions>,
        required: true,
    },
});

const gameOptions = reactive(props.gameOptions);
const { currentLobby } = storeToRefs(useLobbyStore());

const timeControl = toRef(gameOptions.timeControlType);
watch<TimeControlType>(timeControl, t => gameOptions.timeControlType = t);

// ranked: by default, exploration is enabled for correspondence (and can be changed by host)
watch(currentLobby, () => {
    gameOptions.explorationAllowed = currentLobby.value === 'correspondence';
    gameOptions.opponentMustBeRegistered = currentLobby.value === 'correspondence';
}, { immediate: true });
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block">
            <div class="modal-dialog">
                <form class="modal-content" @submit.prevent="confirm(gameOptions)">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ $t('1v1_ranked.title') }}</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <AppBoardsize v-model="gameOptions.boardsize" :boardsizeMin="RANKED_BOARDSIZE_MIN" :boardsizeMax="RANKED_BOARDSIZE_MAX" :sizesSelection="[11, 13, 14, 17, 19]" />
                        </div>

                        <div class="mb-3">
                            <AppTimeControl v-model="timeControl" />
                        </div>
                    </div>
                    <div class="modal-body border-top">
                        <div class="mb-3">
                            <AppAllowExploration v-model="gameOptions.explorationAllowed" />
                        </div>

                        <AppOpponentMustBeRegistered v-model="gameOptions.opponentMustBeRegistered" />
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" @click="cancel()">{{ $t('cancel') }}</button>
                        <button type="submit" class="btn btn-warning"><IconTrophy /> {{ $t('1v1_ranked.create') }}</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
