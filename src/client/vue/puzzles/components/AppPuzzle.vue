<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { whenever } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { Game, Puzzle } from '../../../../shared/app/models/index.js';
import { intlFormat } from 'date-fns';
import { autoLocale } from '../../../../shared/app/i18n/index.js';
import { getPuzzleTitle } from '../services/puzzleTitle.js';
import { usePuzzle } from '../composables/usePuzzle.js';
import { puzzleToHexplorerAnalysis } from '../services/puzzleToHexplorer.js';
import { apiPublishPuzzle } from '../../../apiClient.js';
import { HEXPLORER_ANALYSIS_STATE_KEY } from '../../hexplorer/HexplorerState.js';
import { IconAlphabet, IconArrowBarLeft, IconArrowBarRight, IconArrowLeft, IconCheck, IconCircleFill, IconDiagram2, IconLightbulb, IconPencilSquare, IconRepeat, IconSendFill, IconXLg } from '../../icons.js';
import AppPseudo from '../../components/AppPseudo.vue';
import useAuthStore from '../../../stores/authStore.js';

const props = defineProps<{
    puzzle: Puzzle;
}>();

const {
    gameView,
    status,
    ended,
    nextColor,
    messages,
    canUndo,
    canHint,
    undo,
    restart,
    hint,
} = usePuzzle(props.puzzle);

const gameViewElement = useTemplateRef('game-view-element');

whenever(gameViewElement, async element => {
    await gameView.value.mount(element);
}, {
    once: true,
});

const sidebarOpen = ref(true);

const hexplorerAnalysis = puzzleToHexplorerAnalysis(props.puzzle);

const { loggedInPlayer } = storeToRefs(useAuthStore());

/**
 * Local, as draft can be published from this page.
 */
const published = ref(props.puzzle.published);
const publishing = ref(false);

const publish = async (): Promise<void> => {
    publishing.value = true;

    try {
        published.value = (await apiPublishPuzzle(props.puzzle.publicId)).published;
    } finally {
        publishing.value = false;
    }
};

const formatGameDate = (game: Game): string => intlFormat(
    game.startedAt ?? game.createdAt,
    { day: 'numeric', month: 'long', year: 'numeric' },
    { locale: autoLocale() },
);

const isAuthor = computed(() => !!props.puzzle.author && props.puzzle.author.publicId === loggedInPlayer.value?.publicId);
</script>

<template>
    <div class="puzzle-layout row g-0 flex-nowrap position-relative bg-body">
        <div class="col d-flex flex-column h-100 overflow-hidden">
            <div ref="game-view-element" class="flex-grow-1 overflow-hidden"></div>

            <div class="d-flex flex-wrap justify-content-center align-items-center gap-1 position-relative py-1 px-5">
                <div class="btn-group">
                    <button
                        @click="restart()"
                        class="btn btn-outline-warning"
                        :disabled="!canUndo"
                    ><IconRepeat /> {{ $t('puzzles.restart') }}</button>

                    <button
                        @click="undo()"
                        class="btn btn-outline-primary"
                        :disabled="!canUndo"
                    ><IconArrowLeft /> {{ $t('undo.undo_move') }}</button>
                </div>

                <button
                    type="button"
                    class="btn btn-outline-primary position-absolute end-0 top-50 translate-middle-y me-2"
                    @click="sidebarOpen = !sidebarOpen"
                >
                    <IconArrowBarLeft v-if="!sidebarOpen" />
                    <IconArrowBarRight v-else />
                </button>
            </div>
        </div>

        <div v-if="sidebarOpen" class="puzzle-sidebar col-sm-6 col-lg-5 col-xl-4 d-flex flex-column h-100 border-start bg-body-tertiary">
            <div class="flex-grow-1 overflow-auto p-3">
                <h1 class="h4">{{ getPuzzleTitle(puzzle) }}</h1>

                <p class="small">
                    <span v-if="published" class="badge text-bg-success me-2">{{ $t('puzzles.published') }}</span>
                    <span v-else class="badge text-bg-warning me-2">{{ $t('puzzles.draft') }}</span>

                    <template v-if="puzzle.author">
                        {{ $t('puzzles.by') }} <AppPseudo :player="puzzle.author" />
                    </template>
                </p>

                <p v-if="puzzle.game" class="small">
                    <i18next
                        v-if="puzzle.game.gameToPlayers?.length === 2"
                        :translation="$t('puzzles.from_game_of', { date: formatGameDate(puzzle.game) })"
                    >
                        <template #game>
                            <router-link :to="{ name: 'online-game', params: { gameId: puzzle.game.publicId } }">{{ $t('puzzles.from_game_link') }}</router-link>
                        </template>
                        <template #red>
                            <AppPseudo :player="puzzle.game.gameToPlayers[0].player" classes="text-danger" />
                        </template>
                        <template #blue>
                            <AppPseudo :player="puzzle.game.gameToPlayers[1].player" classes="text-primary" />
                        </template>
                    </i18next>

                    <router-link v-else :to="{ name: 'online-game', params: { gameId: puzzle.game.publicId } }">{{ $t('puzzles.from_game') }}</router-link>
                </p>

                <p v-if="isAuthor" class="d-flex gap-2">
                    <router-link
                        :to="{ name: 'puzzle-edit', params: { publicId: puzzle.publicId } }"
                        class="btn btn-sm btn-outline-primary"
                    ><IconPencilSquare /> {{ $t('puzzles.edit') }}</router-link>

                    <button
                        v-if="!published"
                        class="btn btn-sm btn-success"
                        :disabled="publishing"
                        @click="publish()"
                    ><IconSendFill /> {{ $t('puzzles.publish') }}</button>
                </p>

                <p v-if="puzzle.description" class="pre-line">{{ puzzle.description }}</p>

                <p>
                    {{ $t('puzzles.you_play') }}
                    <span v-if="puzzle.playerColor === 0" class="text-danger"><IconCircleFill /> {{ $t('game.red') }}</span>
                    <span v-else class="text-primary"><IconCircleFill /> {{ $t('game.blue') }}</span>
                </p>

                <p v-if="'player_turn' === status" class="text-body-secondary">{{ $t('puzzles.your_turn') }}</p>

                <div v-for="(message, index) in messages" :key="index" class="alert alert-info pre-line">{{ message }}</div>

                <div v-if="'solved' === status" class="p-3 mb-3 rounded fw-bold text-bg-success"><IconCheck /> {{ $t('puzzles.solved') }}</div>
                <div v-else-if="'failed' === status" class="p-3 mb-3 rounded fw-bold text-bg-danger"><IconXLg /> {{ $t('puzzles.failed') }}</div>

                <p v-if="ended" class="text-body-secondary">
                    {{ $t('puzzles.free_play') }}
                    <span v-if="nextColor === 0" class="text-danger"><IconCircleFill /> {{ $t('game.red') }}</span>
                    <span v-else class="text-primary"><IconCircleFill /> {{ $t('game.blue') }}</span>
                </p>

                <div class="d-flex gap-2">
                    <button
                        v-if="'failed' === status"
                        @click="undo()"
                        class="btn btn-primary"
                    ><IconArrowLeft /> {{ $t('undo.undo_move') }}</button>

                    <button
                        v-if="'failed' === status || 'solved' === status"
                        @click="restart()"
                        class="btn btn-warning"
                    ><IconRepeat /> {{ $t('puzzles.restart') }}</button>
                </div>

                <hr>

                <div class="d-flex flex-wrap gap-2">
                    <button
                        @click="hint()"
                        class="btn btn-sm btn-outline-success"
                        :disabled="!canHint"
                    ><IconLightbulb /> {{ $t('puzzles.hint') }}</button>

                    <router-link
                        :to="{ name: 'hexplorer', state: { [HEXPLORER_ANALYSIS_STATE_KEY]: hexplorerAnalysis } }"
                        class="btn btn-sm btn-outline-primary"
                    ><IconDiagram2 /> {{ $t('puzzles.solution_in_hexplorer') }}</router-link>

                    <button
                        @click="gameView.toggleDisplayCoords()"
                        class="btn btn-sm btn-outline-secondary"
                        :aria-label="$t('toggle_coords')"
                        :title="$t('toggle_coords')"
                    ><IconAlphabet /> {{ $t('toggle_coords_short') }}</button>
                </div>
            </div>

            <div class="border-top p-2">
                <button
                    type="button"
                    class="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                    @click="sidebarOpen = false"
                ><IconArrowBarRight /> {{ $t('close') }}</button>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.puzzle-layout
    height calc(100vh - 3rem) // (fallback if dvh is not supported)
    height calc(100dvh - 3rem) // 3rem = header height

// Sidebar over the board on small screens
@media (max-width: 575.5px)
    .puzzle-sidebar
        position absolute
        top 0
        right 0
        --bs-bg-opacity 0.85

.pre-line
    white-space pre-line
</style>
