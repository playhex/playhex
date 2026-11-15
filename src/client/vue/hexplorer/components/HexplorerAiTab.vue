<script setup lang="ts">
/*
 * AI analysis: enabled or not (disabled by default), engine, what is displayed for each color, auto-play.
 */
import { computed, inject } from 'vue';
import { hexplorerKey } from '../composables/useHexplorer.js';
import type { AnalyzerInterface } from '../analyzers/AnalyzerInterface.js';
import HexplorerPlayerNameInput from './HexplorerPlayerNameInput.vue';
import { IconExclamationTriangle, IconPercent, IconStarFill } from '../../icons.js';

const props = defineProps<{
    analyzers: AnalyzerInterface[];
}>();

const {
    state,
    aiEnabled,
    analysisError,
    currentAnalyzer,
    setAnalyzer,
    isAnalyzerAvailable,
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
</script>

<template>
    <div>
        <div class="form-check form-switch mb-2">
            <input
                id="hexplorer-ai-enabled"
                type="checkbox"
                role="switch"
                class="form-check-input"
                v-model="aiEnabled"
            >
            <label class="form-check-label fw-semibold" for="hexplorer-ai-enabled">{{ $t('hexplorer.ai_enabled') }}</label>
        </div>
        <p class="small text-body-secondary mb-3">{{ $t('hexplorer.ai_description') }}</p>

        <div class="d-flex align-items-center gap-2 mb-3">
            <label class="text-muted small text-nowrap" for="analyzer-select">{{ $t('hexplorer.engine') }}</label>
            <select
                id="analyzer-select"
                v-model="selectedAnalyzerName"
                class="form-select form-select-sm"
                :disabled="!aiEnabled"
            >
                <option
                    v-for="a in analyzers"
                    :key="a.getName()"
                    :value="a.getName()"
                    :disabled="!isAnalyzerAvailable(a)"
                >{{ a.getName() }}</option>
            </select>
        </div>
        <template v-if="aiEnabled">
            <div v-if="isCurrentAnalyzerUnavailable" class="mb-3">
                <p class="text-warning small mb-0"><IconExclamationTriangle /> {{ $t('hexplorer.engine_unavailable') }}</p>
                <router-link :to="{ name: 'spawn-worker' }" class="small">{{ $t('workers.see_how_to_spawn_a_worker') }}</router-link>
            </div>
            <p v-else-if="analysisError === 'failed'" class="text-danger small mb-3"><IconExclamationTriangle /> {{ $t('hexplorer.analysis_failed') }}</p>
        </template>

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
                            <HexplorerPlayerNameInput :player />
                        </td>
                        <td class="text-center">
                            <input
                                type="checkbox"
                                class="form-check-input"
                                v-model="state.winrateEnabled[player]"
                                :disabled="!aiEnabled"
                            >
                        </td>
                        <td class="text-center">
                            <input
                                type="checkbox"
                                class="form-check-input"
                                v-model="state.policyEnabled[player]"
                                :disabled="!aiEnabled"
                            >
                        </td>
                        <td class="text-center">
                            <input
                                type="checkbox"
                                class="form-check-input"
                                v-model="state.autoPlay[player]"
                                @change="resumeAutoPlay()"
                                :disabled="!aiEnabled || state.autoPlay[1 - player]"
                            >
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="d-flex gap-3 px-1">
            <div class="form-check form-check-inline mb-0">
                <input
                    id="policy-show-numbers"
                    type="checkbox"
                    class="form-check-input"
                    v-model="state.policyShowNumbers"
                    :disabled="!aiEnabled"
                >
                <label class="form-check-label small d-flex align-items-center gap-1" for="policy-show-numbers"><IconPercent /> {{ $t('hexplorer.policy_show_numbers') }}</label>
            </div>
            <div class="form-check form-check-inline mb-0">
                <input
                    id="policy-show-best-mark"
                    type="checkbox"
                    class="form-check-input"
                    v-model="state.policyShowBestMark"
                    :disabled="!aiEnabled"
                >
                <label class="form-check-label small d-flex align-items-center gap-1" for="policy-show-best-mark"><IconStarFill /> {{ $t('hexplorer.policy_show_best_mark') }}</label>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.color-settings
    th, td
        padding 0.15rem 0.5rem

    th:not(:first-child), td:not(:first-child)
        width 1%
        white-space nowrap
</style>
