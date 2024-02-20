import { defineStore } from 'pinia';
import { Ref, ref, watch } from 'vue';

type DarkOrLight = 'dark' | 'light';
type SelectedTheme = DarkOrLight | 'auto';

const useDarkLightThemeStore = defineStore('darkLightThemeStore', () => {

    /**
     * Selected theme in settings, can be "light" or "dark", but also "auto".
     * See displayedTheme to get current theme used.
     */
    const selectedTheme: Ref<SelectedTheme> = ref('auto');

    const displayedTheme = (): DarkOrLight => {
        if ('auto' !== selectedTheme.value) {
            return selectedTheme.value;
        }

        return getSystemPreferredTheme();
    };

    const getSystemPreferredTheme = (): DarkOrLight => window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    ;

    const switchTheme = (): void => {
        selectedTheme.value = displayedTheme() === 'light'
            ? 'dark'
            : 'light'
        ;
    };

    const storedTheme = localStorage?.getItem('selectedTheme');

    if (storedTheme === 'light' || storedTheme === 'dark') {
        selectedTheme.value = storedTheme;
    }

    document.documentElement.setAttribute('data-bs-theme', displayedTheme());

    watch(selectedTheme, theme => {
        localStorage?.setItem('selectedTheme', theme);
        document.documentElement.setAttribute('data-bs-theme', displayedTheme());
    });

    return {
        selectedTheme,
        displayedTheme,
        switchTheme,
    };
});

export default useDarkLightThemeStore;
