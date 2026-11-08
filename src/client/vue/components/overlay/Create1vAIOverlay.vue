<script setup lang="ts">
import { useDisclosure } from '@overlastic/vue';
import { computed, PropType, reactive, Ref, ref, toRef, watch } from 'vue';
import { IconCaretDownFill, IconCaretRight, IconCheckCircleFill, IconExclamationTriangle, IconRobot } from '../../icons.js';
import AppBoardsize from './create-game/AppBoardsize.vue';
import AppPlayFirstOrSecond from './create-game/AppPlayFirstOrSecond.vue';
import AppSwapRule from './create-game/AppSwapRule.vue';
import AppHandicap from './create-game/AppHandicap.vue';
import { useHandicapOptions } from '../../composables/useHandicapOptions.js';
import AppTimeControl from '../AppTimeControl.vue';
import useAiConfigsStore from '../../../stores/aiConfigsStore.js';
import useAuthStore from '../../../stores/authStore.js';
import usePlayerFavoriteTimeControlsStore from '../../../stores/playerFavoriteTimeControlsStore.js';
import usePlayerLocalSettingsStore from '../../../stores/playerLocalSettingsStore.js';
import { storeToRefs } from 'pinia';
import { AiAvailabilityData } from '../../../../shared/app/Types.js';
import { apiGetAiAvailability, apiGetBeatenBots } from '../../../apiClient.js';
import { AIConfig, GameOptions } from '../../../../shared/app/models/index.js';
import TimeControlType from '../../../../shared/time-control/TimeControlType.js';

const { visible, confirm, cancel } = useDisclosure();

const props = defineProps({
    gameOptions: {
        type: Object as PropType<GameOptions>,
        required: true,
    },
});

const gameOptions = reactive(props.gameOptions);
const presetOpponentPublicId = props.gameOptions.opponentPublicId;

const { swapRuleDisabled, firstPlayerDisabled } = useHandicapOptions(gameOptions);

const timeControl = toRef(gameOptions.timeControlType);
watch<TimeControlType>(timeControl, t => gameOptions.timeControlType = t);

const showSecondaryOptions = ref(false);

/**
 * AppTimeControl is only mounted with secondary options.
 * If player never opened them, time control is the default one, not a player choice:
 * do not remember it as the last used one.
 */
const timeControlShown = ref(false);

const openSecondaryOptions = (): void => {
    showSecondaryOptions.value = true;
    timeControlShown.value = true;
};

const { setLastCustomTimeControl } = usePlayerFavoriteTimeControlsStore();

const submit = (): void => {
    if (timeControlShown.value) {
        setLastCustomTimeControl(gameOptions.timeControlType);
    }

    confirm(gameOptions);
};

/*
 * AI configs
 */
const { aiConfigs } = storeToRefs(useAiConfigsStore());
const selectedAiConfig = ref<AIConfig | null>(null);
const aiAvailability: Ref<null | AiAvailabilityData> = ref(null);

void (async () => {
    aiAvailability.value = await apiGetAiAvailability();
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
    if (aiAvailability.value === null) {
        return false;
    }

    return aiAvailability.value.availableAiPlayerPublicIds.includes(aiConfig.player!.publicId);
};

/**
 * Whether we know this AI cannot be played because no worker is connected for its engine.
 */
const isAIConfigUnavailable = (aiConfig: AIConfig): boolean => aiAvailability.value !== null
    && !isAIConfigAvailable(aiConfig);

/**
 * AI for which "not available" message is displayed.
 * Hover title does not work on mobile, so message is also shown on click.
 */
const unavailableNoticeFor = ref<null | string>(null);

const toggleUnavailableNotice = (aiConfig: AIConfig): void => {
    const { publicId } = aiConfig.player!;

    unavailableNoticeFor.value = unavailableNoticeFor.value === publicId ? null : publicId;
};

// Keep a requested opponent, including when its availability arrives after the AI list.
// Otherwise, select the first (easiest) available AI.
const selectFirstAiConfig = () => {
    if (aiConfigs.value.length === 0) {
        return;
    }

    if (selectedAiConfig.value !== null && (presetOpponentPublicId !== null || aiAvailability.value === null || isAIConfigAvailable(selectedAiConfig.value))) {
        return;
    }

    const firstAiConfig = aiConfigs.value.find(aiConfig => aiConfig.player.publicId === presetOpponentPublicId)
        ?? aiConfigs.value.find(isAIConfigAvailable)
        ?? aiConfigs.value[0];
    gameOptions.opponentPublicId = firstAiConfig.player.publicId;
    selectAiConfig(firstAiConfig);
};

selectFirstAiConfig();

watch([aiConfigs, aiAvailability], () => {
    selectFirstAiConfig();
});

/*
 * Simple mode: only easy, medium and hard buttons, for new players who don't know AIs.
 * Falls back on full list if some of these AIs do not exist.
 */
const DIFFICULTY_PRESETS = [
    { daviesLevel: 1, labelKey: '1vAI_friendly.easy', btnClass: 'btn-outline-success' },
    { daviesLevel: 4, labelKey: '1vAI_friendly.medium', btnClass: 'btn-outline-warning' },
    { daviesLevel: 7, labelKey: '1vAI_friendly.hard', btnClass: 'btn-outline-danger' },
] as const;

const difficulties = computed(() => DIFFICULTY_PRESETS.flatMap(preset => {
    const aiConfig = aiConfigs.value.find(({ engine, config }) => engine === 'davies' && config.level === preset.daviesLevel);

    return aiConfig ? [{ ...preset, aiConfig }] : [];
}));

const { localSettings } = storeToRefs(usePlayerLocalSettingsStore());

const simpleMode = computed((): boolean => presetOpponentPublicId === null
    && !localSettings.value.showAllAis
    && (aiConfigs.value.length === 0 || difficulties.value.length === DIFFICULTY_PRESETS.length));

const playAgainst = (aiConfig: AIConfig): void => {
    if (aiAvailability.value === null) {
        return;
    }

    if (!isAIConfigAvailable(aiConfig)) {
        toggleUnavailableNotice(aiConfig);
        return;
    }

    gameOptions.opponentPublicId = aiConfig.player!.publicId;
    selectAiConfig(aiConfig);
    submit();
};

/*
 * Progression: which difficulties player has already beaten
 */
const { loggedInPlayer } = storeToRefs(useAuthStore());
const beatenBotPublicIds = ref<string[]>([]);

watch(() => loggedInPlayer.value?.publicId, async playerPublicId => {
    if (!playerPublicId) {
        return;
    }

    try {
        beatenBotPublicIds.value = (await apiGetBeatenBots(playerPublicId))?.botPublicIds ?? [];
    } catch (e) {
        // Progression is only informative, overlay still works without it
    }
}, { immediate: true });

const isBeaten = (aiConfig: AIConfig): boolean => beatenBotPublicIds.value.includes(aiConfig.player!.publicId);

const allDifficultiesBeaten = computed((): boolean => difficulties.value.length === DIFFICULTY_PRESETS.length
    && difficulties.value.every(({ aiConfig }) => isBeaten(aiConfig)));
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block">
            <div class="modal-dialog">
                <form class="modal-content" @submit.prevent="submit()">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ $t('1vAI_friendly.title') }}</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div v-if="simpleMode" class="modal-body">
                        <div class="d-flex gap-2">
                            <button
                                v-for="{ aiConfig, labelKey, btnClass } in difficulties"
                                :key="aiConfig.player.publicId"
                                type="button"
                                class="difficulty btn px-1 text-center"
                                :class="[btnClass, { 'opacity-50': isAIConfigUnavailable(aiConfig) }]"
                                :aria-disabled="!isAIConfigAvailable(aiConfig)"
                                :title="isAIConfigUnavailable(aiConfig) ? $t('workers.ai_not_available') : undefined"
                                @click="playAgainst(aiConfig)"
                            >
                                <span class="d-block text-nowrap">
                                    {{ $t(labelKey) }}
                                    <IconCheckCircleFill v-if="isBeaten(aiConfig)" :aria-label="$t('1vAI_friendly.beaten')" />
                                    <IconExclamationTriangle v-if="isAIConfigUnavailable(aiConfig)" />
                                </span>
                                <small class="d-block text-truncate">{{ unavailableNoticeFor === aiConfig.player.publicId ? $t('workers.ai_not_available') : aiConfig.label }}</small>
                            </button>
                        </div>

                        <div class="text-center mt-3">
                            <button
                                type="button"
                                :class="allDifficultiesBeaten ? 'btn btn-primary' : 'btn btn-link btn-sm text-secondary'"
                                @click="localSettings.showAllAis = true"
                            >{{ $t('1vAI_friendly.unlock_stronger_ais') }}</button>
                        </div>
                    </div>
                    <div v-else class="modal-body">
                        <div class="mb-3">
                            <h6><IconRobot class="me-1" /> AI engine and level</h6>

                            <div v-for="aiConfig in aiConfigs" :key="aiConfig.player.publicId" class="form-check d-flex align-items-baseline">
                                <input
                                    v-model="gameOptions.opponentPublicId"
                                    @click="selectAiConfig(aiConfig)"
                                    required
                                    :disabled="!isAIConfigAvailable(aiConfig)"
                                    class="form-check-input flex-shrink-0 me-2"
                                    :class="'level-' + aiConfig.relativeLevel"
                                    type="radio"
                                    name="flexRadioDefault"
                                    :id="aiConfig.player.publicId"
                                    :value="aiConfig.player.publicId"
                                >
                                <label class="form-check-label" :for="aiConfig.player.publicId">
                                    {{ aiConfig.label }} <small class="text-secondary">{{ aiConfig.description }}</small>
                                </label>
                                <button
                                    v-if="isAIConfigUnavailable(aiConfig)"
                                    type="button"
                                    class="btn btn-link btn-sm text-warning flex-shrink-0 p-0 ms-2 align-baseline"
                                    :title="$t('workers.ai_not_available')"
                                    :aria-label="$t('workers.ai_not_available')"
                                    @click="toggleUnavailableNotice(aiConfig)"
                                ><IconExclamationTriangle /></button>
                                <small v-if="unavailableNoticeFor === aiConfig.player.publicId" class="unavailable-notice text-truncate text-warning ms-2">{{ $t('workers.ai_not_available') }}</small>
                            </div>
                        </div>

                        <div class="mb-3">
                            <AppBoardsize
                                v-model="gameOptions.boardsize"
                                :boardsizeMin="selectedAiConfig?.boardsizeMin ?? undefined"
                                :boardsizeMax="selectedAiConfig?.boardsizeMax ?? undefined"
                            />
                        </div>

                        <button
                            v-if="showSecondaryOptions"
                            @click="showSecondaryOptions = false"
                            type="button"
                            class="btn btn-primary btn-sm mt-3"
                        ><IconCaretDownFill /> {{ $t('create_game.less_options') }}</button>
                        <button
                            v-else
                            @click="openSecondaryOptions()"
                            type="button"
                            class="btn btn-outline-primary btn-sm mt-3"
                        ><IconCaretRight /> {{ $t('create_game.more_options') }}</button>
                    </div>
                    <div v-if="!simpleMode && showSecondaryOptions" class="modal-body border-top">
                        <div class="mb-3">
                            <AppTimeControl v-model="timeControl" />
                        </div>

                        <div class="mb-3">
                            <AppHandicap v-model="gameOptions.presetHandicap" :opponentLabel="$t('handicap.ai')" />
                        </div>

                        <div class="mb-3">
                            <AppPlayFirstOrSecond v-model="gameOptions.firstPlayer" :disabled="firstPlayerDisabled" />
                        </div>

                        <div class="mb-3">
                            <AppSwapRule v-model="gameOptions.swapRule" :disabled="swapRuleDisabled" />
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" @click="cancel()">{{ $t('cancel') }}</button>
                        <button v-if="!simpleMode" type="submit" class="btn btn-success">{{ $t('1vAI_friendly.create') }}</button>
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

.level-1
    background-color #d1e7dd

.level-2
    background-color var(--bs-success)

.level-3
    background-color var(--bs-warning)

.level-4
    background-color var(--bs-danger)

.level-5
    background-color #520dc2

.level-6
    background-color #290661


.level-0
    background-color var(--bs-secondary)

input[type="radio"]:checked + label
    font-weight bold

.difficulty
    flex 1 1 0
    min-width 0

// Shrinks before AI label starts to wrap
.unavailable-notice
    flex 0 100 auto
    min-width 3em
</style>
