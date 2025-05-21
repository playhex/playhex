<script setup lang="ts">
import { useExtendOverlay } from '@overlastic/vue';
import { PropType, toRef, toRefs, watch } from 'vue';
import { HostedGameOptions } from '../../../../shared/app/models/index.js';
import AppBoardsize from './create-game/AppBoardsize.vue';
import AppTimeControl from '../AppTimeControl.vue';
import { RANKED_BOARDSIZE_MIN, RANKED_BOARDSIZE_MAX } from '../../../../shared/app/ratingUtils.js';
import { BIconTrophy } from 'bootstrap-icons-vue';
import TimeControlType from '../../../../shared/time-control/TimeControlType.js';

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
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block">
            <div class="modal-dialog">
                <form class="modal-content" @submit.prevent="resolve(gameOptions)">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ $t('1v1_ranked.title') }}</h5>
                        <button type="button" class="btn-close" @click="reject()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <AppBoardsize :gameOptions="gameOptions" :boardsizeMin="RANKED_BOARDSIZE_MIN" :boardsizeMax="RANKED_BOARDSIZE_MAX" :sizesSelection="[11, 13, 14, 17, 19]" />
                        </div>

                        <div class="mb-3">
                            <AppTimeControl v-model="timeControl" />
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" @click="reject()">{{ $t('cancel') }}</button>
                        <button type="submit" class="btn btn-warning"><BIconTrophy /> {{ $t('1v1_ranked.create') }}</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
