<script setup lang="ts">
/*
 * Settings, evaluation and tree of the analysis, with what edits current node.
 */
import { computed, inject } from 'vue';
import { hexplorerKey } from '../composables/useHexplorer.js';
import type { AnalyzerInterface } from '../analyzers/AnalyzerInterface.js';
import { HEXPLORER_COMMENT_MAX_LENGTH, HEXPLORER_PLAYER_NAME_MAX_LENGTH } from '../../../../shared/app/hexplorerStudy.js';
import EvaluationGraph from './EvaluationGraph.vue';
import MoveTree from './MoveTree.vue';
import HexplorerSetupTools from './HexplorerSetupTools.vue';
import {
    IconChatRightText,
    IconCircleFill,
    IconDiagram2,
    IconExclamationTriangle,
    IconGraphUp,
    IconPercent,
    IconStarFill,
} from '../../icons.js';

const props = defineProps<{
    analyzers: AnalyzerInterface[];
}>();

const {
    tree,
    currentNodeId,
    state,
    analysisError,
    evalHistory,
    evalCursorIndex,
    goToEvalIndex,
    userGoToNode,
    currentAnalyzer,
    setAnalyzer,
    isAnalyzerAvailable,
    currentComment,
    resumeAutoPlay,
} = inject(hexplorerKey)!;

const selectedAnalyzerName = computed({
    get: () => currentAnalyzer.value?.getName() ?? '',
    set: name => {
        const analyzer = props.analyzers.find(a => a.getName() === name) ?? null;
        setAnalyzer(analyzer);
    },
});

const isCurrentAnalyzerUnavailable = computed(() => analysisError.value === 'engine_unavailable'
    || (currentAnalyzer.value !== null && !isAnalyzerAvailable(currentAnalyzer.value)));

/*
 * Player names, editable inline in the settings table.
 */
const playerName = (player: 0 | 1): string =>
    (player === 0 ? state.value.playerBlackName : state.value.playerWhiteName) ?? '';

const setPlayerName = (player: 0 | 1, event: Event): void => {
    const name = (event.target as HTMLInputElement).value || undefined;

    if (player === 0) {
        state.value.playerBlackName = name;
    } else {
        state.value.playerWhiteName = name;
    }
};
</script>

<template>
    <div>
        <div class="table-responsive border rounded bg-body mb-2">
            <table class="table table-sm table-borderless align-middle mb-0 color-settings">
                <thead>
                    <tr class="text-muted small">
                        <th></th>
                        <th class="text-center">{{ $t('hexplorer.win_rate') }}</th>
                        <th class="text-center">{{ $t('hexplorer.policy') }}</th>
                        <th class="text-center">{{ $t('hexplorer.autoplay') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="player in [0, 1] as const" :key="player">
                        <td>
                            <div class="d-flex align-items-center gap-1" :class="player === 0 ? 'text-danger' : 'text-primary'">
                                <IconCircleFill />
                                <input
                                    type="text"
                                    class="player-name-input fw-semibold"
                                    :value="playerName(player)"
                                    :maxlength="HEXPLORER_PLAYER_NAME_MAX_LENGTH"
                                    :placeholder="player === 0 ? $t('game.red') : $t('game.blue')"
                                    @input="setPlayerName(player, $event)"
                                >
                            </div>
                        </td>
                        <td class="text-center">
                            <input
                                type="checkbox"
                                class="form-check-input"
                                v-model="state.winrateEnabled[player]"
                            >
                        </td>
                        <td class="text-center">
                            <input
                                type="checkbox"
                                class="form-check-input"
                                v-model="state.policyEnabled[player]"
                            >
                        </td>
                        <td class="text-center">
                            <input
                                type="checkbox"
                                class="form-check-input"
                                v-model="state.autoPlay[player]"
                                @change="resumeAutoPlay()"
                                :disabled="state.autoPlay[1 - player]"
                            >
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="d-flex gap-3 px-1 mb-3">
            <div class="form-check form-check-inline mb-0">
                <input
                    id="policy-show-numbers"
                    type="checkbox"
                    class="form-check-input"
                    v-model="state.policyShowNumbers"
                >
                <label class="form-check-label small d-flex align-items-center gap-1" for="policy-show-numbers"><IconPercent /> {{ $t('hexplorer.policy_show_numbers') }}</label>
            </div>
            <div class="form-check form-check-inline mb-0">
                <input
                    id="policy-show-best-mark"
                    type="checkbox"
                    class="form-check-input"
                    v-model="state.policyShowBestMark"
                >
                <label class="form-check-label small d-flex align-items-center gap-1" for="policy-show-best-mark"><IconStarFill /> {{ $t('hexplorer.policy_show_best_mark') }}</label>
            </div>
        </div>

        <h6 class="d-flex align-items-center gap-2 mb-2">
            <IconGraphUp /> {{ $t('hexplorer.evaluation') }}
        </h6>
        <div class="d-flex align-items-center gap-2 mb-3">
            <label class="text-muted small text-nowrap" for="analyzer-select">{{ $t('hexplorer.engine') }}</label>
            <select
                id="analyzer-select"
                v-model="selectedAnalyzerName"
                class="form-select form-select-sm"
            >
                <option
                    v-for="a in analyzers"
                    :key="a.getName()"
                    :value="a.getName()"
                    :disabled="!isAnalyzerAvailable(a)"
                >{{ a.getName() }}</option>
            </select>
        </div>
        <div v-if="isCurrentAnalyzerUnavailable" class="mb-3">
            <p class="text-warning small mb-0"><IconExclamationTriangle /> {{ $t('hexplorer.engine_unavailable') }}</p>
            <router-link :to="{ name: 'spawn-worker' }" class="small">{{ $t('workers.see_how_to_spawn_a_worker') }}</router-link>
        </div>
        <p v-else-if="analysisError === 'failed'" class="text-danger small mb-3"><IconExclamationTriangle /> {{ $t('hexplorer.analysis_failed') }}</p>

        <EvaluationGraph
            :evalHistory
            :cursorIndex="evalCursorIndex"
            class="mb-3 bg-body"
            @select="goToEvalIndex"
        />

        <h6 class="d-flex align-items-center gap-2 mb-2">
            <IconDiagram2 /> {{ $t('hexplorer.move_history') }}
        </h6>
        <div class="move-tree-wrapper bg-body mb-2">
            <MoveTree
                :tree
                :nodeId="0"
                :currentNodeId
                @select="userGoToNode"
            />
        </div>

        <HexplorerSetupTools />

        <h6 class="d-flex align-items-center gap-2 mt-3 mb-2">
            <IconChatRightText /> {{ $t('hexplorer.comment') }}
        </h6>
        <textarea
            v-model="currentComment"
            class="form-control form-control-sm mb-3"
            rows="3"
            :maxlength="HEXPLORER_COMMENT_MAX_LENGTH"
            :placeholder="$t('hexplorer.comment_placeholder')"
            :aria-label="$t('hexplorer.comment')"
        ></textarea>
    </div>
</template>

<style lang="stylus" scoped>
.move-tree-wrapper
    max-height 50vh
    min-height 5rem
    overflow auto
    border 1px solid var(--bs-border-color)
    border-radius var(--bs-border-radius)
    padding 0.5rem

.color-settings
    th, td
        padding 0.15rem 0.5rem

    th:not(:first-child), td:not(:first-child)
        width 1%
        white-space nowrap

    .player-name-input
        width 100%
        min-width 3rem
        border none
        background transparent
        padding 0
        color inherit
        outline none

        &::placeholder
            color inherit
            opacity 0.65

        &:hover, &:focus
            text-decoration underline dotted
</style>
