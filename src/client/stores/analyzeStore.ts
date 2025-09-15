import { defineStore } from 'pinia';
import useSocketStore from './socketStore.js';
import { GameAnalyze } from '../../shared/app/models/index.js';
import { Ref, ref } from 'vue';
import { apiGetGameAnalyze, apiRequestGameAnalyze } from '../apiClient.js';

/**
 * Store game analyzes, fetch, update them.
 */
const useAnalyzeStore = defineStore('analyzeStore', () => {

    const { socket } = useSocketStore();

    const gameAnalyzes: { [gamePublicId: string]: Ref<null | GameAnalyze> } = {};

    /**
     * Get an initial ref to a game analyze that will update automatically.
     */
    const getAnalyze = (gamePublicId: string): Ref<null | GameAnalyze> => {
        if (gameAnalyzes[gamePublicId]) {
            return gameAnalyzes[gamePublicId];
        }

        return gameAnalyzes[gamePublicId] = ref(null);
    };

    /**
     * Returns a game analyze.
     *
     * Pass request = true to request if not yet requested:
     * it will then returns a GameAnalyze in processing state.
     *
     * If requested but not yet processed,
     * gameAnalyze.analyze and endedAt will be null.
     *
     * Returned value is a ref which will update automatically.
     */
    const loadAnalyze = (gamePublicId: string, request = false): Ref<null | GameAnalyze> => {
        const gameAnalyze = getAnalyze(gamePublicId);

        if ((gameAnalyze.value?.analyze ?? null) !== null) {
            return gameAnalyze;
        }

        void (async () => {
            gameAnalyze.value = request
                ? await apiRequestGameAnalyze(gamePublicId)
                : await apiGetGameAnalyze(gamePublicId)
            ;
        })();

        return gameAnalyze;
    };

    socket.on('analyze', (gameId: string, gameAnalyze: GameAnalyze) => {
        if (gameAnalyzes[gameId]) {
            gameAnalyzes[gameId].value = gameAnalyze;
        }
    });

    return {
        getAnalyze,
        loadAnalyze,
    };

});

export default useAnalyzeStore;
