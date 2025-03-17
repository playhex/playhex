import Player from '../../shared/app/models/Player';
import { authLogin, authLogout, authMeOrSignupGuest, authSignupFromGuest } from '../../client/apiClient';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import useSocketStore from './socketStore';
import usePlayersStore from './playersStore';

const useAuthStore = defineStore('authStore', () => {

    const { socket } = useSocketStore();
    const { playerRef } = usePlayersStore();

    /**
     * Current logged in player
     */
    const loggedInPlayer = ref<null | Player>(null);

    (async () => {
        try {
            const player = await authMeOrSignupGuest();
            loggedInPlayer.value = playerRef(player, true);
        } catch (e) {
            // seems offline
        }
    })();

    const login = async (pseudo: string, password: string): Promise<Player> => {
        return loggedInPlayer.value = playerRef(await authLogin(pseudo, password), true);
    };

    const signup = async (pseudo: string, password: string): Promise<Player> => {
        return loggedInPlayer.value = playerRef(await authSignupFromGuest(pseudo, password), true);
    };

    const logout = async (): Promise<Player> => {
        return loggedInPlayer.value = playerRef(await authLogout(), true);
    };

    socket.on('ratingsUpdated', (gameId, ratings) => {
        if (null === loggedInPlayer.value) {
            return;
        }

        for (const rating of ratings) {
            if ('overall' !== rating.category) {
                continue;
            }

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
