<script setup lang="ts">
import { ref } from 'vue';
import type { Move } from '@playhex/move-notation';
import { t } from 'i18next';
import type { PuzzleMonitorUncoveredLineCount } from '../../../../shared/app/puzzles/puzzleMonitor.js';
import { IconEye, IconEyeSlash } from '../../icons.js';

/*
 * List of uncovered lines, paginated, see AppPuzzleMonitorUncoveredLines.
 */

defineProps<{
    lines: PuzzleMonitorUncoveredLineCount[];

    /**
     * Lines are marked as false positive: can be unmarked.
     */
    ignored: boolean;
}>();

const emit = defineEmits<{
    select: [moves: Move[]];
    setIgnored: [moves: Move[], ignored: boolean];
}>();

/**
 * Lines shown before "show more".
 */
const PAGE_SIZE = 5;

/**
 * Prefix moves shown before uncovered move, earlier ones are replaced by "…".
 */
const SHOWN_PREFIX_MOVES = 3;

const shownCount = ref(PAGE_SIZE);

const ignore = (moves: Move[]): void => {
    if (confirm(t('puzzles.editor.monitor_ignore_confirm'))) {
        emit('setIgnored', moves, true);
    }
};
</script>

<template>
    <div v-if="lines.length > 0" class="list-group">
        <div
            v-for="line in lines.slice(0, shownCount)"
            :key="line.moves.join(' ')"
            class="list-group-item list-group-item-action d-flex align-items-center gap-2 p-0"
        >
            <button
                type="button"
                class="btn btn-link text-reset text-decoration-none text-start flex-grow-1 d-flex align-items-center gap-1 py-2 ps-3 pe-0 font-monospace"
                :title="line.moves.join(' ')"
                @click="emit('select', line.moves)"
            >
                <span v-if="line.moves.length - 1 > SHOWN_PREFIX_MOVES" class="text-body-tertiary">…</span>
                <span class="text-body-secondary">{{ line.moves.slice(0, -1).slice(-SHOWN_PREFIX_MOVES).join(' ') }}</span>
                <span class="badge" :class="ignored ? 'text-bg-secondary' : 'text-bg-danger'">{{ line.moves[line.moves.length - 1] }}</span>
                <span class="badge rounded-pill text-bg-secondary ms-auto" :title="$t('puzzles.editor.monitor_players', { count: line.count })">{{ line.count }}</span>
            </button>

            <button
                v-if="ignored"
                type="button"
                class="btn btn-sm btn-link text-body-secondary pe-3"
                :title="$t('puzzles.editor.monitor_unignore')"
                :aria-label="$t('puzzles.editor.monitor_unignore')"
                @click="emit('setIgnored', line.moves, false)"
            ><IconEye /></button>

            <button
                v-else
                type="button"
                class="btn btn-sm btn-link text-body-secondary pe-3"
                :title="$t('puzzles.editor.monitor_ignore')"
                :aria-label="$t('puzzles.editor.monitor_ignore')"
                @click="ignore(line.moves)"
            ><IconEyeSlash /></button>
        </div>
    </div>

    <button
        v-if="lines.length > shownCount"
        type="button"
        class="btn btn-link btn-sm mt-1 px-0"
        @click="shownCount += PAGE_SIZE"
    >{{ $t('puzzles.editor.monitor_show_more') }}</button>
</template>
