import { defineStore, storeToRefs } from 'pinia';
import HostedGame from '../../shared/app/models/HostedGame.js';
import { PlayingGameFacade } from '../../shared/pixi-board/facades/PlayingGameFacade.js';
import { shouldShowConditionalMoves } from '../../shared/app/hostedGameUtils.js';
import { apiGetConditionalMoves, apiPatchConditionalMoves } from 'apiClient.js';
import { ConditionalMovesEditorState, createConditionalMovesEditorState } from '../../shared/pixi-board/conditional-moves/ConditionalMovesEditorState.js';
import ConditionalMovesEditor from '../../shared/pixi-board/conditional-moves/ConditionalMovesEditor.js';
import { ConditionalMovesFacade } from '../../shared/pixi-board/conditional-moves/ConditionalMovesFacade.js';
import useAuthStore from './authStore.js';
import useSocketStore from './socketStore.js';
import { ref, shallowRef } from 'vue';

/**
 * Current remote game I am focused on.
 *
 * Store is shared between many parts of the UI that interact with conditional moves:
 * - game sidebar
 * - bottom game menu
 *
 * When switching to another game, game is unloaded and new game is loaded.
 * Reloading a game is best way to keep it synchronised and not miss updates.
 */
const useCurrentGameStore = defineStore('currentGameStore', () => {

    const { loggedInPlayer } = storeToRefs(useAuthStore());
    const socketStore = useSocketStore();

    const hostedGame = ref<null | HostedGame>(null);

    const loadGame = (gamePublicId: string): void => {

    };

    /*
     * Conditional moves
     */
    const conditionalMovesFacade = shallowRef<null | ConditionalMovesFacade>(null);
    const conditionalMovesEditor = shallowRef<null | ConditionalMovesEditor>(null);
    const conditionalMovesEditorState = ref<null | ConditionalMovesEditorState>(null);

    /**
     * Whether we show conditional move editor controls
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

        if (conditionalMovesFacade.value) {
            conditionalMovesFacade.value.destroy();
            conditionalMovesFacade.value = null;
        }

        currentHostedGame = null;
        conditionalMovesEditor.value = null;
        conditionalMovesEditorState.value = null;
    };

    /**
     * Init conditional moves context for a given game.
     */
    const initConditionalMoves = async (hostedGame: HostedGame, playingGameFacade: PlayingGameFacade, myIndex: 0 | 1): Promise<void> => {
        resetConditionalMoves();

        currentHostedGame = hostedGame;

        if (loggedInPlayer.value === null || !shouldShowConditionalMoves(currentHostedGame, loggedInPlayer.value)) {
            resetConditionalMoves();
            return;
        }

        const conditionalMoves = await apiGetConditionalMoves(hostedGame.publicId);

        conditionalMovesEditorState.value = createConditionalMovesEditorState(myIndex, conditionalMoves);
        conditionalMovesEditor.value = new ConditionalMovesEditor(conditionalMovesEditorState.value);
        conditionalMovesFacade.value = new ConditionalMovesFacade(playingGameFacade, conditionalMovesEditor.value);

        // TODO
        // unlistenGameView = listenGameViewEvents(conditionalMovesEditor.value as ConditionalMovesEditor, gameView);
        conditionalMovesEditor.value.on('conditionalMovesSubmitted', () => apiPatchConditionalMoves(hostedGame.publicId, conditionalMoves));
    };

    return {
        conditionalMovesFacade,
        conditionalMovesEditor,
        conditionalMovesEditorState,
        conditionalMovesEnabled,
        resetConditionalMoves,
        initConditionalMoves,
    };
});

export default useCurrentGameStore;
