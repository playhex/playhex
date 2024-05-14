<script setup lang="ts">
import { useOverlayMeta } from 'unoverlay-vue';
import { PropType, ref } from 'vue';
import HostedGameOptions, { sanitizeGameOptions } from '../../../../shared/app/models/HostedGameOptions';
import { BIconCaretDownFill, BIconCaretRight } from 'bootstrap-icons-vue';
import AppBoardsize from './create-game/AppBoardsize.vue';
import AppPlayFirstOrSecond from './create-game/AppPlayFirstOrSecond.vue';
import AppSwapRule from './create-game/AppSwapRule.vue';

const { visible, confirm, cancel } = useOverlayMeta();

const props = defineProps({
    gameOptions: {
        type: Object as PropType<Partial<HostedGameOptions>>,
        required: true,
    },
});

export type Create1vOfflineAIOverlayInput = typeof props;

const gameOptions = ref<HostedGameOptions>({ ...new HostedGameOptions(), ...props.gameOptions });

const showSecondaryOptions = ref(false);

const submitForm = (gameOptions: HostedGameOptions): void => {
    confirm(sanitizeGameOptions(gameOptions));
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
                        <div class="mb-3">
                            <AppBoardsize :gameOptions="gameOptions" />
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
                        <button type="button" class="btn btn-outline-secondary" @click="cancel()">{{ $t('cancel') }}</button>
                        <button type="submit" class="btn btn-success">{{ $t('play_vs_offline_ai') }}</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
