import { ref, shallowRef } from 'vue';
import { defineStore, storeToRefs } from 'pinia';
import { HostedGame } from '../../shared/app/models/index.js';
import useAuthStore from './authStore.js';
import { shouldShowConditionalMoves } from '../../shared/app/hostedGameUtils.js';
import { apiGetConditionalMoves, apiPatchConditionalMoves } from '../apiClient.js';
import { PlayerIndex } from '../../shared/game-engine/index.js';
import ConditionalMovesEditor from '../../shared/pixi-board/conditional-moves/ConditionalMovesEditor.js';
import { PlayingGameFacade } from '../../shared/pixi-board/facades/PlayingGameFacade.js';
import { ConditionalMovesEditorState, createConditionalMovesEditorState } from '../../shared/pixi-board/conditional-moves/ConditionalMovesEditorState.js';
import { ConditionalMovesFacade } from '../../shared/pixi-board/conditional-moves/ConditionalMovesFacade.js';

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

    let conditionalMovesFacade: null | ConditionalMovesFacade = null;

    const conditionalMovesEditor = shallowRef<null | ConditionalMovesEditor>(null);

    const conditionalMovesEditorState = ref<null | ConditionalMovesEditorState>(null);

    /**
     * Whether we show conditional move editor UI
     */
    const conditionalMovesEnabled = ref(false);

    let unlistenGameView: null | (() => void) = null;

    /**
     * Reset context, to call when leaving a game.
     */
    const resetConditionalMoves = (): void => {
        if (unlistenGameView !== null) {
            unlistenGameView();
            unlistenGameView = null;
        }

        if (conditionalMovesFacade) {
            conditionalMovesFacade.destroy();
            conditionalMovesFacade = null;
        }

        currentHostedGame = null;
        conditionalMovesEditor.value = null;
        conditionalMovesEditorState.value = null;
    };

    /**
     * Init conditional moves context for a given game.
     */
    const initConditionalMoves = async (hostedGame: HostedGame, playingGameFacade: PlayingGameFacade, myIndex: PlayerIndex): Promise<void> => {
        resetConditionalMoves();

        currentHostedGame = hostedGame;

        if (loggedInPlayer.value === null || !shouldShowConditionalMoves(currentHostedGame, loggedInPlayer.value)) {
            resetConditionalMoves();
            return;
        }

        const conditionalMoves = await apiGetConditionalMoves(hostedGame.publicId);

        conditionalMovesEditorState.value = createConditionalMovesEditorState(myIndex, conditionalMoves);
        conditionalMovesEditor.value = new ConditionalMovesEditor(conditionalMovesEditorState.value);
        conditionalMovesFacade = new ConditionalMovesFacade(playingGameFacade, conditionalMovesEditor.value);

        // TODO
        // unlistenGameView = listenGameViewEvents(conditionalMovesEditor.value as ConditionalMovesEditor, gameView);
        conditionalMovesEditor.value.on('conditionalMovesSubmitted', () => apiPatchConditionalMoves(hostedGame.publicId, conditionalMoves));
    };

    return {
        conditionalMovesEditor,
        conditionalMovesEditorState,
        conditionalMovesEnabled,
        resetConditionalMoves,
        initConditionalMoves,
    };
});

export default useConditionalMovesStore;
