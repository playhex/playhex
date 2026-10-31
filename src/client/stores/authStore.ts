import { Player } from '../../shared/app/models/index.js';
import { apiChangePseudo, authLogin, authLogout, authMeOrSignupGuest, authSignupFromGuest } from '../../client/apiClient.js';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import useSocketStore from './socketStore.js';

const useAuthStore = defineStore('authStore', () => {

    const { socket } = useSocketStore();

    /**
     * Current logged in player
     */
    const loggedInPlayer = ref<null | Player>(null);

    void (async () => {
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

    /**
     * @throws {DomainHttpError}
     */
    const changePseudo = async (pseudo: string): Promise<Player> => {
        const player = await apiChangePseudo(pseudo);

        if (loggedInPlayer.value !== null) {
            loggedInPlayer.value.pseudo = player.pseudo;
            loggedInPlayer.value.slug = player.slug;
        }

        return player;
    };

    socket.on('ratingsUpdated', (gameId, ratings) => {
        if (loggedInPlayer.value === null) {
            return;
        }

        for (const rating of ratings) {
            if (rating.category !== 'overall') {
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
        changePseudo,
    };
});

export default useAuthStore;
