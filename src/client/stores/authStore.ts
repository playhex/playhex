import Player from '../../shared/app/models/Player';
import { authLogin, authLogout, authMeOrSignupGuest, authSignupFromGuest } from '@client/apiClient';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import useSocketStore from './socketStore';

const useAuthStore = defineStore('authStore', () => {

    const { socket } = useSocketStore();

    /**
     * Current logged in player
     */
    const loggedInPlayer = ref<null | Player>(null);

    (async () => {
        try {
            const player = await authMeOrSignupGuest();
            loggedInPlayer.value = player;
        } catch (e) {
            // seems offline
        }
    })();

    const login = async (pseudo: string, password: string): Promise<Player> => {
        return loggedInPlayer.value = await authLogin(pseudo, password);
    };

    const signup = async (pseudo: string, password: string): Promise<Player> => {
        return loggedInPlayer.value = await authSignupFromGuest(pseudo, password);
    };

    const logout = async (): Promise<Player> => {
        return loggedInPlayer.value = await authLogout();
    };

    socket.on('ratingsUpdated', (gameId, ratings) => {
        if (null === loggedInPlayer.value) {
            return;
        }

        for (const rating of ratings) {
            if (rating.player.publicId === loggedInPlayer.value.publicId) {
                loggedInPlayer.value.currentRating = rating;
            }
        }
    });

    return {
        loggedInPlayer,
        login,
        signup,
        logout,
    };
});

export default useAuthStore;
