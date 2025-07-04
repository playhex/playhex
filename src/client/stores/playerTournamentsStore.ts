import { defineStore, storeToRefs } from 'pinia';
import { ref, watch } from 'vue';
import Tournament from '../../shared/app/models/Tournament.js';
import { apiGetActiveTournaments } from '../apiClient.js';
import useAuthStore from './authStore.js';

/**
 * List of tournaments current player is subscribed or participating.
 * Used to show tournament icon in header.
 */
const usePlayerTournamentsStore = defineStore('playerTournamentsStore', () => {

    const { loggedInPlayer } = storeToRefs(useAuthStore());

    const myTournaments = ref<Tournament[]>([]);

    watch(loggedInPlayer, async player => {
        if (null === player) {
            myTournaments.value = [];
            return;
        }

        myTournaments.value = await apiGetActiveTournaments(player.publicId);
    });

    return {
        myTournaments,
    };
});

export default usePlayerTournamentsStore;
