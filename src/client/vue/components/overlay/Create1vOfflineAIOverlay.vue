<script setup lang="ts">
import { useOverlayMeta } from 'unoverlay-vue';
import { PropType, ref } from 'vue';
import { GameOptionsData, sanitizeGameOptions } from '@shared/app/GameOptions';
import { defaultGameOptions } from '@shared/app/GameOptions';
import { BIconCaretDownFill, BIconCaretRight } from 'bootstrap-icons-vue';
import AppBoardsize from './create-game/AppBoardsize.vue';
import AppPlayFirstOrSecond from './create-game/AppPlayFirstOrSecond.vue';
import AppSwapRule from './create-game/AppSwapRule.vue';

const { visible, confirm, cancel } = useOverlayMeta();

const props = defineProps({
    gameOptions: {
        type: Object as PropType<Partial<GameOptionsData>>,
        required: true,
    },
});

export type Create1vOfflineAIOverlayInput = typeof props;

const gameOptions = ref<GameOptionsData>({ ...defaultGameOptions, ...props.gameOptions });

const showSecondaryOptions = ref(false);

const submitForm = (gameOptions: GameOptionsData): void => {
    confirm(sanitizeGameOptions(gameOptions));
};
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block">
            <div class="modal-dialog">
                <form class="modal-content" @submit="e => { e.preventDefault(); submitForm(gameOptions); }">
                    <div class="modal-header">
                        <h5 class="modal-title">Game options</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <AppBoardsize :game-options="gameOptions" />
                        </div>

                        <button
                            v-if="showSecondaryOptions"
                            @click="showSecondaryOptions = false"
                            type="button"
                            class="btn btn-primary btn-sm mt-3"
                        ><BIconCaretDownFill /> Less options</button>
                        <button
                            v-else
                            @click="showSecondaryOptions = true"
                            type="button"
                            class="btn btn-outline-primary btn-sm mt-3"
                        ><BIconCaretRight /> More options</button>
                    </div>
                    <div v-if="showSecondaryOptions" class="modal-body border-top">
                        <div class="mb-3">
                            <AppPlayFirstOrSecond :game-options="gameOptions" />
                        </div>

                        <div class="mb-3">
                            <AppSwapRule :game-options="gameOptions" />
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" @click="cancel()">Cancel</button>
                        <button type="submit" class="btn btn-success">Play vs AI offline</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
