<script setup lang="ts">
import { useDisclosure } from '@overlastic/vue';
import { PropType, reactive } from 'vue';
import AppBoardsize from '../../components/overlay/create-game/AppBoardsize.vue';
import AppSwapRule from '../../components/overlay/create-game/AppSwapRule.vue';
import AppLocalTimeControlSelect from '../components/AppLocalTimeControlSelect.vue';
import AppLocalDisplayModeSelect from '../components/AppLocalDisplayModeSelect.vue';
import { Local1v1GameOptions } from '../models/Local1v1GameOptions.js';

const { visible, confirm, cancel } = useDisclosure();

const props = defineProps({
    gameOptions: {
        type: Object as PropType<Local1v1GameOptions>,
        required: true,
    },
});

const gameOptions = reactive(props.gameOptions);
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block">
            <div class="modal-dialog">
                <form class="modal-content" @submit.prevent="confirm(gameOptions)">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ $t('local_play.with_friend') }}</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <h6>{{ $t('local_play.display_mode') }}</h6>

                            <AppLocalDisplayModeSelect v-model="gameOptions.tabletop" explain />
                        </div>

                        <div class="mb-3">
                            <AppBoardsize v-model="gameOptions.boardsize" />
                        </div>

                        <div class="mb-3">
                            <AppLocalTimeControlSelect v-model="gameOptions.timeControl" />
                        </div>

                        <div class="mb-3">
                            <AppSwapRule v-model="gameOptions.swapRule" />
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" @click="cancel()">{{ $t('cancel') }}</button>
                        <button type="submit" class="btn btn-success">{{ $t('local_play.create') }}</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
