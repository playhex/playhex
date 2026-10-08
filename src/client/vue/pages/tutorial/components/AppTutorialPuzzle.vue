<script setup lang="ts">
import { useTemplateRef, watch } from 'vue';
import { whenever } from '@vueuse/core';
import { Puzzle } from '../../../../../shared/app/models/index.js';
import type { TutorialPuzzle } from '../../../../../shared/app/tutorial/tutorialPuzzles.js';
import { usePuzzle } from '../../../puzzles/composables/usePuzzle.js';
import { IconArrowLeft, IconCheck, IconCircleFill, IconLightbulb, IconRepeat, IconXLg } from '../../../icons.js';

/**
 * Plays a tutorial puzzle. Messages in puzzle tree are i18n keys.
 */
const props = defineProps<{
    puzzle: TutorialPuzzle;
}>();

const emit = defineEmits<{
    solved: [];
}>();

const puzzle = Object.assign(new Puzzle(), {
    disabledCells: [],
    lastMove: null,
    ...props.puzzle,
});

const {
    gameView,
    status,
    messages,
    resultMessage,
    canUndo,
    canHint,
    undo,
    restart,
    hint,
} = usePuzzle(puzzle);

const gameViewElement = useTemplateRef('game-view-element');

whenever(gameViewElement, async element => {
    await gameView.value.mount(element);
}, {
    once: true,
});

watch(status, newStatus => {
    if (newStatus === 'solved') {
        emit('solved');
    }
});
</script>

<template>
    <div class="card">
        <div class="card-body">
            <p class="mb-2">
                <span v-if="puzzle.playerColor === 0" class="text-danger"><IconCircleFill /></span>
                <span v-else class="text-primary"><IconCircleFill /></span>
                {{ $t(puzzle.instructionKey) }}
            </p>

            <div ref="game-view-element" class="board"></div>

            <div v-for="(message, index) in messages" :key="index" class="alert alert-info py-2 mb-2">{{ $t(message) }}</div>

            <div v-if="'solved' === status" class="p-2 mb-2 rounded fw-bold text-bg-success"><IconCheck /> {{ resultMessage ? $t(resultMessage) : $t('puzzles.solved') }}</div>
            <div v-else-if="'failed' === status" class="p-2 mb-2 rounded fw-bold text-bg-danger"><IconXLg /> {{ resultMessage ? $t(resultMessage) : $t('puzzles.failed') }}</div>

            <!-- e.g next puzzle button, before other buttons so it is not confused with restart once solved -->
            <slot name="actions"></slot>

            <div class="d-flex flex-wrap justify-content-center gap-2">
                <button
                    @click="undo()"
                    class="btn btn-sm"
                    :class="'failed' === status ? 'btn-primary' : 'btn-outline-primary'"
                    :disabled="!canUndo"
                ><IconArrowLeft /> {{ $t('undo.undo_move') }}</button>

                <button
                    @click="restart()"
                    class="btn btn-sm btn-outline-warning"
                    :disabled="!canUndo"
                ><IconRepeat /> {{ $t('puzzles.restart') }}</button>

                <button
                    @click="hint()"
                    class="btn btn-sm btn-outline-success"
                    :disabled="!canHint"
                ><IconLightbulb /> {{ $t('puzzles.hint') }}</button>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.board
    width 100%
    height 50vh
</style>
