<script setup lang="ts">
import { useExtendOverlay } from '@overlastic/vue';
import { PropType, reactive, ref } from 'vue';
import { BIconCaretDownFill, BIconCaretRight, BIconRobot } from '../../icons/index.js';
import AppBoardsize from '../../components/overlay/create-game/AppBoardsize.vue';
import AppPlayFirstOrSecond from '../../components/overlay/create-game/AppPlayFirstOrSecond.vue';
import AppSwapRule from '../../components/overlay/create-game/AppSwapRule.vue';
import { OfflineAIGameOptions } from '../models/OfflineAIGameOptions.js';
import { LocalAI, localAIs } from '../localAi.js';

const { visible, resolve, reject } = useExtendOverlay();

const props = defineProps({
    gameOptions: {
        type: Object as PropType<OfflineAIGameOptions>,
        required: true,
    },
});

const gameOptions = reactive(props.gameOptions);

const showSecondaryOptions = ref(false);

const boardsizeMin = ref<undefined | number>();
const boardsizeMax = ref<undefined | number>();

const selectLocalAI = (localAI: LocalAI): void => {
    boardsizeMin.value = localAI.boardsizeMin;
    boardsizeMax.value = localAI.boardsizeMax;

    if (localAI.boardsizeMax && gameOptions.boardsize < localAI.boardsizeMax) {
        gameOptions.boardsize = localAI.boardsizeMax;
    }

    if (localAI.boardsizeMax && gameOptions.boardsize > localAI.boardsizeMax) {
        gameOptions.boardsize = localAI.boardsizeMax;
    }
};

selectLocalAI(localAIs[0]);

const submitForm = (gameOptions: OfflineAIGameOptions): void => {
    resolve(gameOptions);
};
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block">
            <div class="modal-dialog">
                <form class="modal-content" @submit="e => { e.preventDefault(); submitForm(gameOptions); }">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ $t('1vAI_offline.title') }}</h5>
                        <button type="button" class="btn-close" @click="reject()"></button>
                    </div>
                    <div class="modal-body">
                        <p>
                            <small>{{ $t('offline_game_explain') }}</small>
                        </p>

                        <div class="mb-3">
                            <h6><BIconRobot class="me-1" /> AI engine and level</h6>

                            <div v-for="localAI in localAIs" :key="localAI.name" class="form-check">
                                <input
                                    v-model="gameOptions.ai"
                                    @click="selectLocalAI(localAI)"
                                    required
                                    class="form-check-input"
                                    type="radio"
                                    name="flexRadioDefault"
                                    :id="localAI.name"
                                    :value="localAI.name"
                                >
                                <label class="form-check-label" :for="localAI.name">
                                    {{ localAI.label }}
                                </label>
                            </div>
                        </div>

                        <div class="mb-3">
                            <AppBoardsize
                                v-model="gameOptions.boardsize"
                                :boardsizeMin
                                :boardsizeMax
                            />
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
                            <AppPlayFirstOrSecond v-model="gameOptions.firstPlayer" />
                        </div>

                        <div class="mb-3">
                            <AppSwapRule v-model="gameOptions.swapRule" />
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" @click="reject()">{{ $t('cancel') }}</button>
                        <button type="submit" class="btn btn-success">{{ $t('1vAI_offline.create') }}</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
