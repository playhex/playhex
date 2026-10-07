import { defineStore } from 'pinia';
import useSocketStore from './socketStore.js';
import useToastsStore from './toastsStore.js';
import { GameAnalyze } from '../../shared/app/models/index.js';
import { Ref, reactive, ref } from 'vue';
import { type AnalyzeApiBase, apiGetGameAnalyze, apiRequestGameAnalyze, apiRequestGameAnalyzeMoveMcts } from '../apiClient.js';
import { t } from 'i18next';

/**
 * Store game analyzes, fetch, update them.
 */
const useAnalyzeStore = defineStore('analyzeStore', () => {

    const { socket } = useSocketStore();

    const gameAnalyzes: { [gamePublicId: string]: Ref<null | GameAnalyze> } = {};

    /**
     * Ids of external games (not played on PlayHex),
     * which analyzes are fetched from another endpoint.
     */
    const externalGameIds = new Set<string>();

    const apiBase = (gamePublicId: string): AnalyzeApiBase => externalGameIds.has(gamePublicId)
        ? '/api/external-games'
        : '/api/games'
    ;

    /**
     * Must be called before loading analyze of an external game.
     * Analyze updates are received in Rooms.externalGame() room, which must be joined.
     */
    const registerExternalGame = (externalGamePublicId: string): void => {
        externalGameIds.add(externalGamePublicId);
    };

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
            try {
                gameAnalyze.value = request
                    ? await apiRequestGameAnalyze(gamePublicId, apiBase(gamePublicId))
                    : await apiGetGameAnalyze(gamePublicId, apiBase(gamePublicId))
                ;
            } catch (e) {
                if (!request) {
                    throw e;
                }

                useToastsStore().addToast(t('game_analysis.request_failed'), { level: 'danger' });
            }
        })();

        return gameAnalyze;
    };

    /**
     * Moves deep analyzes requested and not yet received, as "gamePublicId:moveIndex".
     */
    const pendingMctsMoveAnalyzes = reactive(new Set<string>());

    const isMctsMoveAnalyzePending = (gamePublicId: string, moveIndex: number): boolean =>
        pendingMctsMoveAnalyzes.has(`${gamePublicId}:${moveIndex}`)
    ;

    /**
     * Request a deep analyze (tree search) of a move of an analyzed game.
     * Result comes later with "analyze" socket event.
     */
    const requestMctsMoveAnalyze = async (gamePublicId: string, moveIndex: number): Promise<void> => {
        const key = `${gamePublicId}:${moveIndex}`;

        if (pendingMctsMoveAnalyzes.has(key)) {
            return;
        }

        pendingMctsMoveAnalyzes.add(key);

        try {
            await apiRequestGameAnalyzeMoveMcts(gamePublicId, moveIndex, apiBase(gamePublicId));
        } catch {
            pendingMctsMoveAnalyzes.delete(key);
            useToastsStore().addToast(t('game_analysis.deep_analysis_failed'), { level: 'danger' });
        }
    };

    socket.on('analyze', (gameId: string, gameAnalyze: GameAnalyze) => {
        if (gameAnalyzes[gameId]) {
            gameAnalyzes[gameId].value = gameAnalyze;
        }

        gameAnalyze.analyze?.forEach((move, moveIndex) => {
            if (move?.mcts) {
                pendingMctsMoveAnalyzes.delete(`${gameId}:${moveIndex}`);
            }
        });
    });

    /*
     * Result or failure may have been missed while disconnected,
     * or lost if server restarted: forget pending deep analyzes so they can be requested again,
     * and refetch game analyzes to get results sent meanwhile.
     */
    socket.on('connect', () => {
        const gameIds = new Set([...pendingMctsMoveAnalyzes].map(key => key.split(':')[0]));

        pendingMctsMoveAnalyzes.clear();

        for (const gameId of gameIds) {
            void (async () => {
                const gameAnalyze = await apiGetGameAnalyze(gameId, apiBase(gameId));

                if (gameAnalyzes[gameId] && gameAnalyze !== null) {
                    gameAnalyzes[gameId].value = gameAnalyze;
                }
            })();
        }
    });

    socket.on('analyzeMoveMctsFailed', (gameId: string, moveIndex: number) => {
        if (pendingMctsMoveAnalyzes.delete(`${gameId}:${moveIndex}`)) {
            useToastsStore().addToast(t('game_analysis.deep_analysis_failed'), { level: 'danger' });
        }
    });

    return {
        registerExternalGame,
        getAnalyze,
        loadAnalyze,
        isMctsMoveAnalyzePending,
        requestMctsMoveAnalyze,
    };

});

export default useAnalyzeStore;
