import { EventEmitter } from 'events';
import TypedEventEmitter from 'typed-emitter';

type DarkOrLight = 'dark' | 'light';

/*
 * Dispatch event when user has switched theme
 */

type ThemeSwitcherEvents = {
    themeSwitched: (newTheme: DarkOrLight) => void;
};

class ThemeSwitcherDispatcher extends (EventEmitter as unknown as new () => TypedEventEmitter<ThemeSwitcherEvents>)
{}

export const themeSwitcherDispatcher = new ThemeSwitcherDispatcher();


/*
 * Theme switcher
 */

let currentTheme: DarkOrLight;

const storedTheme: string = localStorage.getItem('theme') ?? 'auto';

const getSystemPreferredTheme = (): DarkOrLight => window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
;

const getPreferredTheme = (): DarkOrLight => {
    if (storedTheme === 'dark' || storedTheme === 'light') {
        return storedTheme;
    }

    return getSystemPreferredTheme();
}

export const getTheme = (): DarkOrLight => currentTheme;

export const setTheme = (theme: DarkOrLight | 'auto'): void => {
    currentTheme = theme === 'auto'
        ? getSystemPreferredTheme()
        : theme
    ;

    document.documentElement.setAttribute('data-bs-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    themeSwitcherDispatcher.emit('themeSwitched', currentTheme);
}

export const getOtherTheme = (): DarkOrLight => currentTheme === 'dark'
    ? 'light'
    : 'dark'
;

export const switchTheme = (): void => {
    setTheme(getOtherTheme());
}

setTheme(getPreferredTheme());
