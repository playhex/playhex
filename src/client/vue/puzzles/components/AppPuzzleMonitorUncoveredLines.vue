<script setup lang="ts">
import { ref } from 'vue';
import type { Move } from '@playhex/move-notation';
import type { PuzzleMonitorUncoveredLineCount } from '../../../../shared/app/puzzles/puzzleMonitor.js';
import AppPuzzleMonitorLineList from './AppPuzzleMonitorLineList.vue';

/*
 * Monitoring: lines played by players not covered by puzzle tree, most played first.
 * Author fixes them by covering them in tree, or by marking them as false positive.
 * See usePuzzleMonitor().
 */

defineProps<{
    /**
     * False if puzzle has never been published: nothing is logged yet.
     */
    enabled: boolean;

    loaded: boolean;
    error: null | string;
    uncoveredLines: PuzzleMonitorUncoveredLineCount[];
    ignoredLines: PuzzleMonitorUncoveredLineCount[];
}>();

const emit = defineEmits<{
    select: [moves: Move[]];
    setIgnored: [moves: Move[], ignored: boolean];
}>();

const showIgnored = ref(false);
</script>

<template>
    <h2 class="h5">{{ $t('puzzles.editor.monitor_uncovered_lines') }}</h2>

    <p v-if="!enabled" class="alert alert-info small">{{ $t('puzzles.editor.monitor_not_published') }}</p>

    <template v-else>
        <p class="small text-body-secondary">{{ $t('puzzles.editor.monitor_uncovered_lines_help') }}</p>

        <div v-if="error" class="alert alert-danger small py-2">{{ error }}</div>

        <p v-if="!loaded && !error">{{ $t('puzzles.loading') }}</p>

        <template v-else-if="loaded">
            <p v-if="uncoveredLines.length === 0" class="text-body-secondary">{{ $t('puzzles.editor.monitor_no_uncovered_lines') }}</p>

            <AppPuzzleMonitorLineList
                :lines="uncoveredLines"
                :ignored="false"
                @select="moves => emit('select', moves)"
                @setIgnored="(moves, ignored) => emit('setIgnored', moves, ignored)"
            />

            <template v-if="showIgnored">
                <h3 class="h6 mt-3">{{ $t('puzzles.editor.monitor_ignored_lines') }}</h3>

                <AppPuzzleMonitorLineList
                    :lines="ignoredLines"
                    :ignored="true"
                    @select="moves => emit('select', moves)"
                    @setIgnored="(moves, ignored) => emit('setIgnored', moves, ignored)"
                />
            </template>

            <div v-if="ignoredLines.length > 0" class="mt-3">
                <button
                    type="button"
                    class="btn btn-link btn-sm px-0"
                    @click="showIgnored = !showIgnored"
                >{{ $t(showIgnored ? 'puzzles.editor.monitor_hide_ignored' : 'puzzles.editor.monitor_show_ignored', { count: ignoredLines.length }) }}</button>
            </div>
        </template>
    </template>
</template>
