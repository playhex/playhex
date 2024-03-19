import Player from '../../shared/app/models/Player';
import { authLogin, authLogout, authMeOrSignupGuest, authSignupFromGuest } from '@client/apiClient';
import { defineStore } from 'pinia';
import { ref } from 'vue';

const useAuthStore = defineStore('authStore', () => {

    /**
     * Current logged in player
     */
    const loggedInPlayer = ref<null | Player>(null);

    authMeOrSignupGuest().then(player => loggedInPlayer.value = player);

    const login = async (pseudo: string, password: string): Promise<Player> => {
        return loggedInPlayer.value = await authLogin(pseudo, password);
    };

    const signup = async (pseudo: string, password: string): Promise<Player> => {
        return loggedInPlayer.value = await authSignupFromGuest(pseudo, password);
    };

    const logout = async (): Promise<Player> => {
        return loggedInPlayer.value = await authLogout();
    };

    return {
        loggedInPlayer,
        login,
        signup,
        logout,
    };
});

export default useAuthStore;
