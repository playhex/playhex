<script setup lang="ts">
import { onUnmounted, PropType } from 'vue';
import { GameViewFacade } from '../../../services/board-view-facades/GameViewFacade.js';
import { IconChevronBarLeft, IconChevronBarRight, IconChevronLeft, IconChevronRight, IconX } from '../../icons.js';

/**
 * Buttons to navigate in simulation mode:
 * rewind, forward, back to current position, close.
 */
const props = defineProps({
    gameViewFacade: {
        type: Object as PropType<GameViewFacade>,
        required: true,
    },

    /**
     * Display close button, and close on Escape.
     */
    closable: {
        type: Boolean,
        default: true,
    },
});

const emit = defineEmits<{
    close: [];
}>();

const simulation = () => props.gameViewFacade.enableSimulationMode();

const rewindZero = () => simulation().rewindToFirstMove();
const backward = () => simulation().rewind(1);
const forward = () => simulation().forward(1);
const rewindCurrent = () => simulation().resetSimulationAndRewind();

const onKeyDown = (event: KeyboardEvent): void => {
    if ((event.target as HTMLElement | null)?.nodeName === 'INPUT') {
        return;
    }

    switch (event.key) {
        case 'ArrowLeft': backward(); break;
        case 'ArrowRight': forward(); break;
        case 'Escape': if (props.closable) emit('close'); break;
    }
};

window.addEventListener('keydown', onKeyDown);
onUnmounted(() => window.removeEventListener('keydown', onKeyDown));
</script>

<template>
    <div class="simulation-controls">
        <button type="button" @click="rewindZero()" class="btn btn-outline-primary">
            <IconChevronBarLeft />
        </button>
        <button type="button" @click="backward()" class="btn btn-outline-primary flex-grow-1">
            <IconChevronLeft />
        </button>
        <button type="button" @click="forward()" class="btn btn-outline-primary flex-grow-1">
            <IconChevronRight />
        </button>
        <button type="button" @click="rewindCurrent()" class="btn btn-outline-primary">
            <IconChevronBarRight />
        </button>
        <button v-if="closable" type="button" @click="emit('close')" class="btn btn-outline-danger">
            <IconX />
        </button>
    </div>
</template>

<style lang="stylus" scoped>
.simulation-controls
    display flex
    justify-content center
    align-items center
    gap 0.25em
    height 3rem
    padding 0 0.25em

    button
        max-width 6em
</style>
