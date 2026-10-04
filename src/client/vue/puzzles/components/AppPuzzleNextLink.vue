<script setup lang="ts">
import { Puzzle } from '../../../../shared/app/models/index.js';
import { IconArrowRight, IconCollection } from '../../icons.js';

/*
 * Link to display once puzzle ended:
 * next puzzle, or back to collection if this was the last one.
 */

defineProps<{
    puzzle: Puzzle;

    /**
     * null if none, or not loaded yet.
     */
    nextPuzzle: null | Puzzle;
}>();
</script>

<template>
    <router-link
        v-if="nextPuzzle"
        :to="{ name: 'puzzle', params: { publicId: nextPuzzle.publicId } }"
        class="btn btn-success"
    >{{ $t('puzzles.next_puzzle') }} <IconArrowRight /></router-link>

    <router-link
        v-else-if="puzzle.collection"
        :to="{ name: 'puzzle-collection', params: { publicId: puzzle.collection.publicId } }"
        class="btn btn-outline-success"
    ><IconCollection /> {{ $t('puzzles.collections.back_to_collection') }}</router-link>
</template>
