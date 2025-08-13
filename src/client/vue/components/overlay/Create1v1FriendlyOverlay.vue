<script setup lang="ts">
import { useExtendOverlay } from '@overlastic/vue';
import { PropType, reactive, ref, toRef, watch } from 'vue';
import HostedGameOptions from '../../../../shared/app/models/HostedGameOptions.js';
import { BIconCaretDownFill, BIconCaretRight } from '../../icons';
import AppBoardsize from './create-game/AppBoardsize.vue';
import AppTimeControl from '../AppTimeControl.vue';
import AppPlayFirstOrSecond from './create-game/AppPlayFirstOrSecond.vue';
import AppSwapRule from './create-game/AppSwapRule.vue';
import TimeControlType from '../../../../shared/time-control/TimeControlType.js';

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

const showSecondaryOptions = ref(false);
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block">
            <div class="modal-dialog">
                <form class="modal-content" @submit.prevent="resolve(gameOptions)">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ $t('1v1_friendly.title') }}</h5>
                        <button type="button" class="btn-close" @click="reject()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <AppBoardsize v-model="gameOptions.boardsize" />
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
                            <AppPlayFirstOrSecond v-model="gameOptions.firstPlayer" />
                        </div>

                        <div class="mb-3">
                            <AppSwapRule v-model="gameOptions.swapRule" />
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" @click="reject()">{{ $t('cancel') }}</button>
                        <button type="submit" class="btn btn-success">{{ $t('1v1_friendly.create') }}</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
