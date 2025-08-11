import { WithRequired } from '../../shared/app/Types.js';
import { AIConfig } from '../../shared/app/models/index.js';
import { apiGetAiConfigs } from '../apiClient.js';
import { defineStore } from 'pinia';
import { Ref, ref } from 'vue';

const useAiConfigsStore = defineStore('aiConfigsStore', () => {

    /**
     * List of available bots.
     */
    const aiConfigs: Ref<WithRequired<AIConfig, 'player'>[]> = ref([]);

    const loadAiConfigs = async (): Promise<void> => {
        aiConfigs.value = await apiGetAiConfigs();
    };

    loadAiConfigs();

    return {
        aiConfigs,
    };
});

export default useAiConfigsStore;
