import { useIntervalFn } from '@vueuse/core';
import { ref, watch, type Ref } from 'vue';
import { KatahexAnalyzer } from '../analyzers/KatahexAnalyzer.js';
import { AnalyzerInterface } from '../analyzers/AnalyzerInterface.js';
import { MCTS_PLAYOUTS } from '../../../../shared/app/mctsSettings.js';
import type { AiAvailabilityData } from '../../../../shared/app/Types.js';
import { apiGetAiAvailability } from '../../../apiClient.js';

/**
 * Katahex engines that can analyze positions on server.
 * Cache names are shared between pages using them.
 */
export const createKatahexAnalyzers = (): KatahexAnalyzer[] => [
    new KatahexAnalyzer('katahex-intuition', 'Katahex Intuition', 'analysisCache'),
    new KatahexAnalyzer('katahex-mcts', `Katahex MCTS ${MCTS_PLAYOUTS}`, 'analysisCacheMcts'),
];

/**
 * Engines availability: an engine without online worker cannot be selected.
 * Refreshed periodically to enable engines when a worker comes online.
 *
 * @param analysisError Last analysis error, to refresh status as soon as server says an engine is unavailable
 */
export const useAnalysisEngines = (analysisError: Ref<null | 'engine_unavailable' | 'failed'>) => {
    const aiAvailability = ref<null | AiAvailabilityData>(null);

    const refreshEnginesStatus = async (): Promise<void> => {
        try {
            aiAvailability.value = await apiGetAiAvailability();
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Could not get analysis engines status', e);
        }
    };

    useIntervalFn(refreshEnginesStatus, 30_000, { immediateCallback: true });

    // Server may know engine is unavailable before next refresh
    watch(analysisError, error => {
        if (error === 'engine_unavailable') {
            void refreshEnginesStatus();
        }
    });

    const isAnalyzerAvailable = (analyzer: AnalyzerInterface): boolean => {
        if (!(analyzer instanceof KatahexAnalyzer) || aiAvailability.value === null) {
            return true;
        }

        return aiAvailability.value.availableAnalysisEngines.includes(analyzer.engine);
    };

    return {
        aiAvailability,
        isAnalyzerAvailable,
    };
};
