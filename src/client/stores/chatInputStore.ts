import { defineStore } from 'pinia';
import { ref, Ref } from 'vue';

/**
 * Provide refs for chatInput, one per game.
 * Used to retrieve chatInput from others components,
 * and manipulate it from elsewhere.
 * Use case: paste hex coords when ctrl+click on board.
 *
 * Also can be used to keep typed text when page change,
 * and go back on game.
 *
 * A future case could be: when I refresh, keep my unsent chat message
 * (by storing text in localStorage).
 */
export const useChatInputStore = defineStore('chatInputStore', () => {

    const refs: { [gameId: string]: Ref<string> } = {};

    const getChatInput = (gameId: string): Ref<string> => {
        if (!refs[gameId]) {
            refs[gameId] = ref('');
        }

        return refs[gameId];
    };

    return {
        getChatInput,
    };

});
