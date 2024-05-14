<script setup lang="ts">
import { useOverlayMeta } from 'unoverlay-vue';
import { PropType, ref } from 'vue';
import HostedGameOptions, { sanitizeGameOptions } from '../../../../shared/app/models/HostedGameOptions';
import { BIconCaretDownFill, BIconCaretRight } from 'bootstrap-icons-vue';
import AppBoardsize from './create-game/AppBoardsize.vue';
import AppTimeControl from './create-game/AppTimeControl.vue';
import AppPlayFirstOrSecond from './create-game/AppPlayFirstOrSecond.vue';
import AppSwapRule from './create-game/AppSwapRule.vue';

const { visible, confirm, cancel } = useOverlayMeta();

const props = defineProps({
    gameOptions: {
        type: Object as PropType<Partial<HostedGameOptions>>,
        required: true,
    },
});

export type Create1v1OverlayInput = typeof props;

const gameOptions = ref<HostedGameOptions>({ ...new HostedGameOptions(), ...props.gameOptions });

const showSecondaryOptions = ref(false);

/*
 * Set data before sumbit form
 */
const timeControlComponent = ref();

const submitForm = (gameOptions: HostedGameOptions): void => {
    timeControlComponent.value.compileOptions();

    confirm(sanitizeGameOptions(gameOptions));
};
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block">
            <div class="modal-dialog">
                <form class="modal-content" @submit="e => { e.preventDefault(); submitForm(gameOptions); }">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ $t('game_create.game_options') }}</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <AppBoardsize :gameOptions="gameOptions" />
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
                        <button type="submit" class="btn btn-success">{{ $t('create_1v1') }}</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
