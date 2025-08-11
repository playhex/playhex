<script setup lang="ts">
import { useExtendOverlay } from '@overlastic/vue';
import { PropType, reactive, Ref, ref, toRef, watch } from 'vue';
import { BIconExclamationTriangle, BIconRobot, BIconTrophy } from '../../icons';
import AppBoardsize from './create-game/AppBoardsize.vue';
import AppTimeControl from '../AppTimeControl.vue';
import useAiConfigsStore from '../../../stores/aiConfigsStore.js';
import { storeToRefs } from 'pinia';
import { AIConfigStatusData } from '../../../../shared/app/Types.js';
import { apiGetAiConfigsStatus } from '../../../apiClient.js';
import { AIConfig, HostedGameOptions } from '../../../../shared/app/models/index.js';
import { RANKED_BOARDSIZE_MIN, RANKED_BOARDSIZE_MAX } from '../../../../shared/app/ratingUtils.js';
import TimeControlType from '../../../../shared/time-control/TimeControlType';

const { min, max } = Math;

const { visible, resolve, reject } = useExtendOverlay();

const props = defineProps({
    gameOptions: {
        type: Object as PropType<HostedGameOptions>,
        required: true,
    },
});

const gameOptions = reactive(props.gameOptions);

const timeControl = toRef(gameOptions.timeControl);
watch<TimeControlType>(timeControl, t => gameOptions.timeControl = t);

/*
 * AI configs
 */
const { aiConfigs } = storeToRefs(useAiConfigsStore());
const selectedAiConfig = ref<AIConfig | null>(null);
const aiConfigsStatus: Ref<null | AIConfigStatusData> = ref(null);

(async () => {
    aiConfigsStatus.value = await apiGetAiConfigsStatus();
})();

const capSelectedBoardsize = () => {
    if (selectedAiConfig.value === null) {
        return;
    }

    const { boardsizeMin, boardsizeMax } = selectedAiConfig.value;

    if (typeof boardsizeMin === 'number' && gameOptions.boardsize < boardsizeMin) {
        gameOptions.boardsize = boardsizeMin;
    }

    if (typeof boardsizeMax === 'number' && gameOptions.boardsize > boardsizeMax) {
        gameOptions.boardsize = boardsizeMax;
    }
};

const selectAiConfig = (aiConfig: AIConfig): void => {
    selectedAiConfig.value = aiConfig;
    capSelectedBoardsize();
};

const isAIConfigAvailable = (aiConfig: AIConfig): boolean => {
    if (!aiConfig.isRemote) {
        return true;
    }

    if (aiConfigsStatus.value === null) {
        return false;
    }

    if (aiConfig.isRemote && !aiConfigsStatus.value.aiApiAvailable) {
        return false;
    }

    if (aiConfig.requireMorePower && !aiConfigsStatus.value.powerfulPeerAvailable) {
        return false;
    }

    return true;
};
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block">
            <div class="modal-dialog">
                <form class="modal-content" @submit.prevent="resolve(gameOptions)">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ $t('1vAI_ranked.title') }}</h5>
                        <button type="button" class="btn-close" @click="reject()"></button>
                    </div>
                    <div class="modal-body">
                        <template v-if="null !== aiConfigsStatus">
                            <p v-if="!aiConfigsStatus.aiApiAvailable" class="text-danger mb-0"><BIconExclamationTriangle /> <small>{{ $t('workers.no_worker') }}</small></p>
                            <p v-else-if="!aiConfigsStatus.powerfulPeerAvailable" class="text-warning mb-0"><BIconExclamationTriangle /> <small>{{ $t('workers.slow_worker') }}</small></p>

                            <p v-if="!aiConfigsStatus.aiApiAvailable || !aiConfigsStatus.powerfulPeerAvailable">
                                <small>
                                    <router-link
                                        :to="{ name: 'spawn-worker' }"
                                        @click="reject()"
                                    >{{ $t('workers.see_how_to_spawn_a_worker') }}</router-link>
                                </small>
                            </p>
                        </template>

                        <div class="mb-3">
                            <h6><BIconRobot class="me-1" /> AI engine and level</h6>

                            <div v-for="aiConfig in aiConfigs" :key="aiConfig.player.publicId" class="form-check">
                                <input
                                    v-model="gameOptions.opponentPublicId"
                                    @click="selectAiConfig(aiConfig)"
                                    required
                                    :disabled="!isAIConfigAvailable(aiConfig)"
                                    class="form-check-input"
                                    type="radio"
                                    name="flexRadioDefault"
                                    :id="aiConfig.player.publicId"
                                    :value="aiConfig.player.publicId"
                                >
                                <label class="form-check-label" :for="aiConfig.player.publicId">
                                    {{ aiConfig.label }} <small class="text-secondary">{{ aiConfig.description }}</small>
                                </label>
                            </div>
                        </div>

                        <div class="mb-3">
                            <AppBoardsize
                                :gameOptions="gameOptions"
                                :boardsizeMin="max(selectedAiConfig?.boardsizeMin ?? RANKED_BOARDSIZE_MIN, RANKED_BOARDSIZE_MIN)"
                                :boardsizeMax="min(selectedAiConfig?.boardsizeMax ?? RANKED_BOARDSIZE_MAX, RANKED_BOARDSIZE_MAX)"
                                :sizesSelection="[11, 13, 14, 17, 19]"
                            />
                        </div>

                        <div class="mb-3">
                            <AppTimeControl v-model="timeControl" />
                        </div>

                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" @click="reject()">{{ $t('cancel') }}</button>
                        <button type="submit" class="btn btn-warning"><BIconTrophy /> {{ $t('1vAI_ranked.create') }}</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>

<style lang="stylus" scoped>
.ai-engine-choice
    .nav-link::first-letter
        text-transform capitalize
</style>
