import { ref } from 'vue';
import { defineStore, storeToRefs } from 'pinia';
import { HostedGame } from '../../shared/app/models/index.js';
import useAuthStore from './authStore.js';
import { shouldShowConditionalMoves } from '../../shared/app/hostedGameUtils.js';
import { apiGetConditionalMoves, apiPatchConditionalMoves } from '../apiClient.js';
import GameView from '../../shared/pixi-board/GameView.js';
import { PlayerIndex } from '../../shared/game-engine/index.js';
import ConditionalMovesEditor, { listenGameViewEvents } from '../../shared/app/ConditionalMovesEditor.js';

/**
 * Context for conditional moves of current game.
 * Store is shared between many parts of the UI that interact with conditional moves:
 * - game sidebar (edit conditional moves tree)
 * - bottom game menu (navigate through moves, cut)
 *
 * Allow to load and init conditional moves for a game,
 * and to reset it when leaving game page.
 */
const useConditionalMovesStore = defineStore('conditionalMovesStore', () => {

    const { loggedInPlayer } = storeToRefs(useAuthStore());

    let currentHostedGame: null | HostedGame = null;

    const conditionalMovesEditor = ref<null | ConditionalMovesEditor>(null);

    let unlistenGameView: null | (() => void) = null;

    /**
     * Reset context, to call when leaving a game.
     */
    const resetConditionalMoves = (): void => {
        if (null !== unlistenGameView) {
            unlistenGameView();
            unlistenGameView = null;
        }

        currentHostedGame = null;
        conditionalMovesEditor.value = null;
    };

    /**
     * Init conditional moves context for a given game.
     */
    const initConditionalMoves = async (hostedGame: HostedGame, gameView: GameView, myIndex: PlayerIndex): Promise<void> => {
        resetConditionalMoves();

        currentHostedGame = hostedGame;

        if (null === loggedInPlayer.value || !shouldShowConditionalMoves(currentHostedGame, loggedInPlayer.value)) {
            resetConditionalMoves();
            return;
        }

        const conditionalMoves = await apiGetConditionalMoves(hostedGame.publicId);

        conditionalMovesEditor.value = new ConditionalMovesEditor(gameView, myIndex, conditionalMoves);

        unlistenGameView = listenGameViewEvents(conditionalMovesEditor.value as ConditionalMovesEditor, gameView);
        conditionalMovesEditor.value.on('conditionalMovesUpdated', () => apiPatchConditionalMoves(hostedGame.publicId, conditionalMoves));
    };

    return {
        conditionalMovesEditor,
        resetConditionalMoves,
        initConditionalMoves,
    };
});

export default useConditionalMovesStore;
