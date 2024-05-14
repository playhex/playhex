<script setup lang="ts">
import { useOverlayMeta } from 'unoverlay-vue';
import { PropType, Ref, ref, watch } from 'vue';
import HostedGameOptions, { sanitizeGameOptions } from '../../../../shared/app/models/HostedGameOptions';
import { BIconCaretDownFill, BIconCaretRight, BIconExclamationTriangle } from 'bootstrap-icons-vue';
import AppBoardsize from './create-game/AppBoardsize.vue';
import AppPlayFirstOrSecond from './create-game/AppPlayFirstOrSecond.vue';
import AppSwapRule from './create-game/AppSwapRule.vue';
import AppTimeControl from './create-game/AppTimeControl.vue';
import useAiConfigsStore from '../../../stores/aiConfigsStore';
import { storeToRefs } from 'pinia';
import { AIConfigStatusData } from '@shared/app/Types';
import { apiGetAiConfigsStatus } from '../../../apiClient';
import AIConfig from '../../../../shared/app/models/AIConfig';

const { visible, confirm, cancel } = useOverlayMeta();

const props = defineProps({
    gameOptions: {
        type: Object as PropType<Partial<HostedGameOptions>>,
        required: true,
    },
});

export type Create1vAIOverlayInput = typeof props;

const gameOptions = ref<HostedGameOptions>({ ...new HostedGameOptions(), ...props.gameOptions });

const showSecondaryOptions = ref(false);
const timeControlComponent = ref();

const submitForm = (gameOptions: HostedGameOptions): void => {
    timeControlComponent.value.compileOptions();

    confirm(sanitizeGameOptions(gameOptions));
};

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
    if (null === selectedAiConfig.value) {
        return;
    }

    const { boardsizeMin, boardsizeMax } = selectedAiConfig.value;

    if ('number' === typeof boardsizeMin && gameOptions.value.boardsize < boardsizeMin) {
        gameOptions.value.boardsize = boardsizeMin;
    }

    if ('number' === typeof boardsizeMax && gameOptions.value.boardsize > boardsizeMax) {
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

    if (null === aiConfigsStatus.value) {
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
                <form class="modal-content" @submit="e => { e.preventDefault(); submitForm(gameOptions); }">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ $t('create_game.game_options') }}</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div class="modal-body">
                        <template v-if="null !== aiConfigsStatus">
                            <p v-if="!aiConfigsStatus.aiApiAvailable" class="text-danger"><BIconExclamationTriangle /> <small>{{ $t('workers.no_worker') }}</small></p>
                            <p v-else-if="!aiConfigsStatus.powerfulPeerAvailable" class="text-warning"><BIconExclamationTriangle /> <small>{{ $t('workers.slow_worker') }}</small></p>
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
                            <AppTimeControl :gameOptions="gameOptions" ref="timeControlComponent" />
                        </div>

                        <button
                            v-if="showSecondaryOptions"
                            @click="showSecondaryOptions = false"
                            type="button"
                            class="btn btn-primary btn-sm mt-3"
                        ><BIconCaretDownFill /> {{ $t('game_create.less_options') }}</button>
                        <button
                            v-else
                            @click="showSecondaryOptions = true"
                            type="button"
                            class="btn btn-outline-primary btn-sm mt-3"
                        ><BIconCaretRight /> {{ $t('game_create.more_options') }}</button>
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
                        <button type="button" class="btn btn-outline-secondary" @click="cancel()">{{ $t('cancel') }}</button>
                        <button type="submit" class="btn btn-success">{{ $t('play_vs_ai') }}</button>
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
