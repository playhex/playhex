<script setup lang="ts">
import { Puzzle } from '../../../../shared/app/models/index.js';
import { getPuzzleTitle } from '../services/puzzleTitle.js';
import AppPuzzleThumbnail from './AppPuzzleThumbnail.vue';
import AppPseudo from '../../components/AppPseudo.vue';
import { formatPuzzleDate } from '../services/puzzleDate.js';
import { IconCollection } from '../../icons.js';

defineProps<{
    puzzle: Puzzle;
}>();
</script>

<template>
    <div class="card h-100">
        <router-link :to="{ name: 'puzzle', params: { publicId: puzzle.publicId } }" class="card-body text-decoration-none p-2">
            <AppPuzzleThumbnail :puzzle />
        </router-link>

        <div class="card-footer small">
            <router-link :to="{ name: 'puzzle', params: { publicId: puzzle.publicId } }" class="fw-bold d-block text-truncate">{{ getPuzzleTitle(puzzle) }}</router-link>

            <router-link
                v-if="puzzle.collection"
                :to="{ name: 'puzzle-collection', params: { publicId: puzzle.collection.publicId } }"
                class="d-block text-truncate text-body-secondary"
            ><IconCollection /> {{ puzzle.collection.name }}</router-link>

            <div class="d-flex justify-content-between gap-2 text-body-secondary">
                <span class="text-truncate">
                    <template v-if="puzzle.author">{{ $t('puzzles.by') }} <AppPseudo :player="puzzle.author" /></template>
                </span>
                <span class="text-nowrap">{{ formatPuzzleDate(puzzle) }}</span>
            </div>
        </div>
    </div>
</template>
