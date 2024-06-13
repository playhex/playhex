<script setup lang="ts">
import { usePrograms } from '@overlastic/vue';
import { PropType, ref } from 'vue';
import HostedGameOptions from '../../../../shared/app/models/HostedGameOptions';
import AppBoardsize from './create-game/AppBoardsize.vue';
import AppTimeControl from './create-game/AppTimeControl.vue';
import { RANKED_BOARDSIZE_MIN, RANKED_BOARDSIZE_MAX } from '../../../../shared/app/ratingUtils';
import { BIconTrophy } from 'bootstrap-icons-vue';

const { visible, resolve, reject } = usePrograms();

const props = defineProps({
    gameOptions: {
        type: Object as PropType<Partial<HostedGameOptions>>,
        required: true,
    },
});

export type Create1v1RankedOverlayInput = typeof props;

const gameOptions = ref<HostedGameOptions>({ ...new HostedGameOptions(), ...props.gameOptions, ranked: true });

/*
 * Set data before sumbit form
 */
const timeControlComponent = ref<typeof AppTimeControl>();

const submitForm = (gameOptions: HostedGameOptions): void => {
    if (undefined === timeControlComponent.value) {
        throw new Error('No element with ref="timeControlComponent" found in template');
    }

    timeControlComponent.value.compileOptions();

    resolve(gameOptions);
};
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block">
            <div class="modal-dialog">
                <form class="modal-content" @submit="e => { e.preventDefault(); submitForm(gameOptions); }">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ $t('1v1_ranked.title') }}</h5>
                        <button type="button" class="btn-close" @click="reject()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <AppBoardsize :gameOptions="gameOptions" :boardsizeMin="RANKED_BOARDSIZE_MIN" :boardsizeMax="RANKED_BOARDSIZE_MAX" :sizesSelection="[11, 13, 14, 17, 19]" />
                        </div>

                        <div class="mb-3">
                            <AppTimeControl :gameOptions="gameOptions" ref="timeControlComponent" />
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
