import { ref } from 'vue';
import { defineStore, storeToRefs } from 'pinia';
import { HostedGame } from '../../shared/app/models';
import useAuthStore from './authStore';
import { shouldShowConditionalMoves } from '../../shared/app/hostedGameUtils';
import { apiGetConditionalMoves, apiPatchConditionalMoves } from '../apiClient';
import GameView from '../../shared/pixi-board/GameView';
import { PlayerIndex } from '../../shared/game-engine';
import ConditionalMovesEditor, { listenGameViewEvents } from '../../shared/app/ConditionalMovesEditor';

/**
 * Context for conditional moves of current game.
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
