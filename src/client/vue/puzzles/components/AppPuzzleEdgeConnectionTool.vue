<script setup lang="ts">
import type { Move } from '@playhex/move-notation';
import { IconArrowUp, IconExclamationTriangle } from '../../icons.js';

/*
 * Tool to connect stones to their edge through disabled cells,
 * shown in both position and engines panels.
 */

defineProps<{
    /**
     * Whether edge tool is the selected position tool.
     */
    selected: boolean;

    /**
     * Last clicked stone that cannot reach any edge.
     */
    error: null | Move;

    /**
     * Connected stones whose path would change the puzzle.
     */
    impossibleConnections: Move[];
}>();

defineEmits<{
    select: [];
}>();
</script>

<template>
    <div class="form-label">{{ $t('puzzles.editor.edge_connections') }}</div>
    <button
        class="btn"
        :class="selected ? 'btn-info' : 'btn-outline-info'"
        @click="$emit('select')"
    ><IconArrowUp /> {{ $t('puzzles.editor.edge_connection_tool') }}</button>
    <div v-if="selected" class="form-text">{{ $t('puzzles.editor.edge_connection_help') }}</div>
    <div v-if="error" class="form-text text-warning-emphasis"><IconExclamationTriangle /> {{ $t('puzzles.editor.edge_connection_unreachable', { move: error }) }}</div>
    <div v-if="impossibleConnections.length > 0" class="alert alert-warning py-2 mt-2 mb-0"><IconExclamationTriangle /> {{ $t('puzzles.editor.edge_connection_broken', { moves: impossibleConnections.join(', ') }) }}</div>
</template>
