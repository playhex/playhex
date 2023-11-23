import { PlayerData } from '@shared/app/Types';
import { loginAsGuest } from '@client/apiClient';
import { defineStore } from 'pinia';
import { ref } from 'vue';

const useAuthStore = defineStore('authStore', () => {

    /**
     * Current logged in user
     */
    const loggedInUser = ref<null | PlayerData>(null);

    const getUserOrLoginAsGuest = async (): Promise<PlayerData> => {
        if (null !== loggedInUser.value) {
            return loggedInUser.value;
        }

        return loggedInUser.value = await loginAsGuest();
    };

    return {
        loggedInUser,
        getUserOrLoginAsGuest,
    };
});

export default useAuthStore;
