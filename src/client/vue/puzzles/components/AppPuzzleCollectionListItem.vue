<script setup lang="ts">
import { PuzzleCollection } from '../../../../shared/app/models/index.js';
import { IconCollection } from '../../icons.js';

/*
 * Puzzle collection as a list-group item, to put in a .list-group
 */

withDefaults(defineProps<{
    collection: PuzzleCollection;
    showAuthor?: boolean;
}>(), {
    showAuthor: true,
});
</script>

<template>
    <router-link
        :to="{ name: 'puzzle-collection', params: { publicId: collection.publicId } }"
        class="list-group-item list-group-item-action d-flex justify-content-between gap-2"
    >
        <span class="text-truncate"><IconCollection /> {{ collection.name }}</span>
        <span class="text-body-secondary small text-nowrap">
            <template v-if="showAuthor && collection.author">{{ $t('puzzles.by') }} {{ collection.author.pseudo }} · </template>
            {{ $t('puzzles.collections.puzzles_count', { count: collection.puzzlesCount ?? 0 }) }}
        </span>
    </router-link>
</template>
