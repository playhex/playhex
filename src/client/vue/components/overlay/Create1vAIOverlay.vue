<script setup lang="ts">
import { useExtendOverlay } from '@overlastic/vue';
import { PropType, Ref, ref, toRef, toRefs, watch } from 'vue';
import { BIconCaretDownFill, BIconCaretRight, BIconExclamationTriangle } from 'bootstrap-icons-vue';
import AppBoardsize from './create-game/AppBoardsize.vue';
import AppPlayFirstOrSecond from './create-game/AppPlayFirstOrSecond.vue';
import AppSwapRule from './create-game/AppSwapRule.vue';
import AppTimeControl from '../AppTimeControl.vue';
import useAiConfigsStore from '../../../stores/aiConfigsStore.js';
import { storeToRefs } from 'pinia';
import { AIConfigStatusData } from '../../../../shared/app/Types.js';
import { apiGetAiConfigsStatus } from '../../../apiClient.js';
import { AIConfig, HostedGameOptions } from '../../../../shared/app/models/index.js';
import TimeControlType from '../../../../shared/time-control/TimeControlType';

const { visible, resolve, reject } = useExtendOverlay();

const props = defineProps({
    gameOptions: {
        type: Object as PropType<HostedGameOptions>,
        required: true,
    },
});

const { gameOptions } = toRefs(props);

const timeControl = toRef(gameOptions.value.timeControl);
watch<TimeControlType>(timeControl, t => gameOptions.value.timeControl = t);

const showSecondaryOptions = ref(false);

/*
 * AI configs
 */
const { aiConfigs } = storeToRefs(useAiConfigsStore());
const selectedEngine = ref<null | string>(null);
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

    if (typeof boardsizeMin === 'number' && gameOptions.value.boardsize < boardsizeMin) {
        gameOptions.value.boardsize = boardsizeMin;
    }

    if (typeof boardsizeMax === 'number' && gameOptions.value.boardsize > boardsizeMax) {
        gameOptions.value.boardsize = boardsizeMax;
    }
};

const selectAiConfig = (aiConfig: AIConfig): void => {
    selectedAiConfig.value = aiConfig;
    capSelectedBoardsize();
};

const selectEngine = (engine: string): void => {
    selectedEngine.value = engine;
};

if (Object.keys(aiConfigs.value).length > 0) {
    selectEngine(Object.keys(aiConfigs.value)[0]);
} else {
    watch(aiConfigs.value, newAiConfig => {
        selectEngine(Object.keys(newAiConfig)[0]);
    });
}

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
                        <h5 class="modal-title">{{ $t('1vAI_friendly.title') }}</h5>
                        <button type="button" class="btn-close" @click="reject()"></button>
                    </div>
                    <div class="modal-body">
                        <template v-if="null !== aiConfigsStatus">
                            <p v-if="!aiConfigsStatus.aiApiAvailable" class="text-danger mb-0"><BIconExclamationTriangle /> <small>{{ $t('workers.no_worker') }}</small></p>
                            <p v-else-if="!aiConfigsStatus.powerfulPeerAvailable" class="text-warning mb-0"><BIconExclamationTriangle /> <small>{{ $t('workers.slow_worker') }}</small></p>

                            <p><small>
                                <router-link
                                    v-if="!aiConfigsStatus.aiApiAvailable || !aiConfigsStatus.powerfulPeerAvailable"
                                    :to="{ name: 'spawn-worker' }"
                                    @click="reject()"
                                >{{ $t('workers.see_how_to_spawn_a_worker') }}</router-link>
                            </small></p>
                        </template>

                        <ul class="nav nav-pills nav-justified ai-engine-choice">
                            <li v-for="(_, engine) in aiConfigs" :key="engine" class="nav-item">
                                <button type="button" class="nav-link" :class="{ active: engine === selectedEngine }" @click="selectEngine(engine as string)">{{ engine }}</button>
                            </li>
                        </ul>

                        <div v-if="selectedEngine" class="engine-configs">
                            <div v-for="aiConfig in aiConfigs[selectedEngine]" :key="aiConfig.player.publicId" class="form-check">
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
                                :boardsizeMin="selectedAiConfig?.boardsizeMin ?? undefined"
                                :boardsizeMax="selectedAiConfig?.boardsizeMax ?? undefined"
                            />
                        </div>

                        <div class="mb-3">
                            <AppTimeControl v-model="timeControl" />
                        </div>

                        <button
                            v-if="showSecondaryOptions"
                            @click="showSecondaryOptions = false"
                            type="button"
                            class="btn btn-primary btn-sm mt-3"
                        ><BIconCaretDownFill /> {{ $t('create_game.less_options') }}</button>
                        <button
                            v-else
                            @click="showSecondaryOptions = true"
                            type="button"
                            class="btn btn-outline-primary btn-sm mt-3"
                        ><BIconCaretRight /> {{ $t('create_game.more_options') }}</button>
                    </div>
                    <div v-if="showSecondaryOptions" class="modal-body border-top">
                        <div class="mb-3">
                            <AppPlayFirstOrSecond :gameOptions="gameOptions" />
                        </div>

                        <div class="mb-3">
                            <AppSwapRule :gameOptions="gameOptions" />
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" @click="reject()">{{ $t('cancel') }}</button>
                        <button type="submit" class="btn btn-success">{{ $t('1vAI_friendly.create') }}</button>
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

.engine-configs
    margin 1em 0 2em 1em
</style>
