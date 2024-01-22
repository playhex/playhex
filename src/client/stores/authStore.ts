import { PublicPlayerData } from '@shared/app/Types';
import { authLogin, authLogout, authMeOrSignupGuest, authSignupFromGuest } from '@client/apiClient';
import { defineStore } from 'pinia';
import { ref } from 'vue';

const useAuthStore = defineStore('authStore', () => {

    /**
     * Current logged in player
     */
    const loggedInPlayer = ref<null | PublicPlayerData>(null);

    authMeOrSignupGuest().then(player => loggedInPlayer.value = player);

    const login = async (pseudo: string, password: string): Promise<PublicPlayerData> => {
        return loggedInPlayer.value = await authLogin(pseudo, password);
    };

    const signup = async (pseudo: string, password: string): Promise<PublicPlayerData> => {
        return loggedInPlayer.value = await authSignupFromGuest(pseudo, password);
    };

    const logout = async (): Promise<PublicPlayerData> => {
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
