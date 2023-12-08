import { PlayerData } from '@shared/app/Types';
import { loginAsGuest } from '@client/apiClient';
import { defineStore } from 'pinia';
import { ref } from 'vue';

const useAuthStore = defineStore('authStore', () => {

    /**
     * Current logged in user
     */
    const loggedInUser = ref<null | PlayerData>(null);

    const loggedInUserPromise = loginAsGuest();

    loggedInUserPromise.then(user => loggedInUser.value = user);

    return {
        loggedInUser,
        loggedInUserPromise,
    };
});

export default useAuthStore;
