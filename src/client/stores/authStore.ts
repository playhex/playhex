import { PublicPlayerData } from '@shared/app/Types';
import { authLogin, authLogout, authMeOrSignupGuest, authSignupFromGuest } from '@client/apiClient';
import { defineStore } from 'pinia';
import { ref } from 'vue';

const useAuthStore = defineStore('authStore', () => {

    /**
     * Current logged in user
     */
    const loggedInUser = ref<null | PublicPlayerData>(null);

    authMeOrSignupGuest().then(user => loggedInUser.value = user);

    const login = async (pseudo: string, password: string): Promise<PublicPlayerData> => {
        return loggedInUser.value = await authLogin(pseudo, password);
    };

    const signup = async (pseudo: string, password: string): Promise<PublicPlayerData> => {
        return loggedInUser.value = await authSignupFromGuest(pseudo, password);
    };

    const logout = async (): Promise<PublicPlayerData> => {
        return loggedInUser.value = await authLogout();
    };

    return {
        loggedInUser,
        login,
        signup,
        logout,
    };
});

export default useAuthStore;
