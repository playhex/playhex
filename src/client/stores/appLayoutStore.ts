import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Lets pages change the global app layout,
 * e.g hide header in local tabletop mode.
 */
const useAppLayoutStore = defineStore('appLayoutStore', () => {

    const headerHidden = ref(false);

    return {
        headerHidden,
    };
});

export default useAppLayoutStore;
