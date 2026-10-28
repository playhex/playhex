import { computed, ref, watch, type Ref } from 'vue';
import type { Move } from '@playhex/move-notation';
import { isUncoveredLine, type PuzzleNode } from '../../../../shared/app/puzzles/puzzleTree.js';
import type { PuzzleMonitorUncoveredLineCount } from '../../../../shared/app/puzzles/puzzleMonitor.js';
import { apiGetPuzzleMonitorUncoveredLines, apiSetPuzzleMonitorUncoveredLineIgnored } from '../../../apiClient.js';
import { apiErrorMessage } from '../../../services/apiErrorMessage.js';

/**
 * Puzzle monitoring in editor: lines played by players not covered by tree.
 * Loaded once puzzle is saved and has been published.
 *
 * @param publicId Null if puzzle is not saved yet
 * @param publishedAt Null if puzzle has never been published: nothing is logged yet
 * @param tree Edited tree, to hide lines covered since then, even not saved yet
 */
export const usePuzzleMonitor = (publicId: Ref<null | string>, publishedAt: Ref<null | Date>, tree: Ref<PuzzleNode>) => {
    const lines = ref<null | PuzzleMonitorUncoveredLineCount[]>(null);
    /**
     * Error when loading lines, or marking one as false positive.
     */
    const error = ref<null | string>(null);

    const enabled = computed(() => publicId.value !== null && publishedAt.value !== null);

    const load = async (): Promise<void> => {
        if (!enabled.value) {
            return;
        }

        error.value = null;

        try {
            lines.value = await apiGetPuzzleMonitorUncoveredLines(publicId.value!);
        } catch (e) {
            error.value = apiErrorMessage(e);
        }
    };

    watch(enabled, load, { immediate: true });

    const stillUncovered = computed(() => lines.value?.filter(({ moves }) => isUncoveredLine(tree.value, moves)) ?? []);

    /**
     * Lines to fix, most played first.
     */
    const uncoveredLines = computed(() => stillUncovered.value.filter(({ ignored }) => !ignored));

    /**
     * Lines marked as false positive, still logged, most played first.
     */
    const ignoredLines = computed(() => stillUncovered.value.filter(({ ignored }) => ignored));

    const setIgnored = async (moves: Move[], ignored: boolean): Promise<void> => {
        if (publicId.value === null) {
            return;
        }

        try {
            await apiSetPuzzleMonitorUncoveredLineIgnored(publicId.value, moves, ignored);
        } catch (e) {
            error.value = apiErrorMessage(e);
            return;
        }

        const key = moves.join(' ');
        const line = lines.value?.find(line => line.moves.join(' ') === key);

        if (line !== undefined) {
            line.ignored = ignored;
        }
    };

    return {
        enabled,
        loaded: computed(() => lines.value !== null),
        error,
        load,
        uncoveredLines,
        ignoredLines,
        setIgnored,
    };
};
