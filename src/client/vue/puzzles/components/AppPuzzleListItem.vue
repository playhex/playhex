<script setup lang="ts">
import { Puzzle } from '../../../../shared/app/models/index.js';
import { getPuzzleTitle } from '../services/puzzleTitle.js';
import { formatPuzzleDate } from '../services/puzzleDate.js';

/*
 * Puzzle as a list-group item, to put in a .list-group
 */

withDefaults(defineProps<{
    puzzle: Puzzle;
    showAuthor?: boolean;
}>(), {
    showAuthor: true,
});
</script>

<template>
    <router-link
        :to="{ name: 'puzzle', params: { publicId: puzzle.publicId } }"
        class="list-group-item list-group-item-action d-flex justify-content-between gap-2"
    >
        <span class="text-truncate">{{ getPuzzleTitle(puzzle) }}</span>
        <span class="text-body-secondary small text-nowrap">
            <template v-if="showAuthor && puzzle.author">{{ $t('puzzles.by') }} {{ puzzle.author.pseudo }} · </template>
            {{ formatPuzzleDate(puzzle) }}
        </span>
    </router-link>
</template>
