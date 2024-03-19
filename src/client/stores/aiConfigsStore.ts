import AIConfig from '../../shared/app/models/AIConfig';
import { apiGetAiConfigs } from '../apiClient';
import { defineStore } from 'pinia';
import { Ref, ref } from 'vue';

const useAiConfigsStore = defineStore('aiConfigsStore', () => {

    /**
     * List of available bots.
     */
    const aiConfigs: Ref<{ [engine: string]: AIConfig<'withPlayerId'>[] }> = ref({});

    const loadAiConfigs = async (): Promise<void> => {
        const configs = await apiGetAiConfigs();

        for (const config of configs) {
            if (!aiConfigs.value[config.engine]) {
                aiConfigs.value[config.engine] = [];
            }

            aiConfigs.value[config.engine].push(config);
        }
    };

    loadAiConfigs();

    return {
        aiConfigs,
    };
});

export default useAiConfigsStore;
