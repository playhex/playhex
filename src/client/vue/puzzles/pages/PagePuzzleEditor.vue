<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { Game, Puzzle } from '../../../../shared/app/models/index.js';
import { canCreatePuzzleFromGame } from '../../../../shared/app/gameUtils.js';
import { apiGetPuzzle, getGame } from '../../../apiClient.js';
import useAuthStore from '../../../stores/authStore.js';
import AppPuzzleEditor from '../components/AppPuzzleEditor.vue';

/*
 * Create a puzzle (/puzzles/new, optionally ?game=<publicId> to start from a game,
 * and ?collection=<publicId> to put it in a collection),
 * or edit an existing one (/puzzles/<publicId>/edit).
 */

const route = useRoute();
const { loggedInPlayer } = storeToRefs(useAuthStore());

const publicId = typeof route.params.publicId === 'string' ? route.params.publicId : null;
const gamePublicId = typeof route.query.game === 'string' ? route.query.game : null;
const collectionPublicId = typeof route.query.collection === 'string' ? route.query.collection : null;

useHead({
    title: t(publicId === null ? 'puzzles.editor.create_title' : 'puzzles.editor.edit_title'),
});

type LoadState =
    | { state: 'loading' }
    | { state: 'error', errorKey: string }
    | { state: 'ready', puzzle: null | Puzzle, sourceGame: null | Game }
;

const load = ref<LoadState>({ state: 'loading' });

watch(loggedInPlayer, async player => {
    // Wait for player, and load only once
    if (player === null || load.value.state !== 'loading') {
        return;
    }

    if (publicId !== null) {
        const puzzle = await apiGetPuzzle(publicId);

        if (puzzle === null) {
            load.value = { state: 'error', errorKey: 'puzzles.not_found' };
        } else if (puzzle.author?.publicId !== player.publicId) {
            load.value = { state: 'error', errorKey: 'puzzles.editor.not_author' };
        } else {
            load.value = { state: 'ready', puzzle, sourceGame: null };
        }

        return;
    }

    if (gamePublicId !== null) {
        const game = await getGame(gamePublicId);

        if (game === null) {
            load.value = { state: 'error', errorKey: 'puzzles.editor.game_not_found' };
        } else if (!canCreatePuzzleFromGame(game)) {
            load.value = { state: 'error', errorKey: 'puzzles.editor.game_not_allowed' };
        } else {
            load.value = { state: 'ready', puzzle: null, sourceGame: game };
        }

        return;
    }

    load.value = { state: 'ready', puzzle: null, sourceGame: null };
}, { immediate: true });
</script>

<template>
    <AppPuzzleEditor
        v-if="'ready' === load.state"
        :puzzle="load.puzzle"
        :sourceGame="load.sourceGame"
        :collectionPublicId
    />

    <div v-else class="container my-3">
        <p v-if="'loading' === load.state">{{ $t('puzzles.loading') }}</p>
        <p v-else class="text-danger">{{ $t(load.errorKey) }}</p>
    </div>
</template>
