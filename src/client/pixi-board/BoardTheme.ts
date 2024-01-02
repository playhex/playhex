import { getTheme, themeSwitcherDispatcher } from '@client/DarkThemeSwitcher';

export type Theme = {
    colorA: number; // --bs-danger
    colorB: number; // --bs-primary
    colorEmpty: number; // --bs-light-bg-subtle
    strokeColor: number; // --bs-dark-bg-subtle
    textColor: number; // --bs-body-color
};

const darkTheme: Theme = {
    colorA: 0xdc3545,
    colorB: 0x0d6efd,
    colorEmpty: 0x343a40,
    strokeColor: 0x1a1d20,
    textColor: 0xdee2e6,
};

const lightTheme: Theme = {
    colorA: 0xdc3545,
    colorB: 0x0d6efd,
    colorEmpty: 0xfcfcfd,
    strokeColor: 0xced4da,
    textColor: 0x212529,
};

export let currentTheme: Theme = getTheme() === 'dark' ? darkTheme : lightTheme;

themeSwitcherDispatcher.on('themeSwitched', () => {
    currentTheme = getTheme() === 'dark' ? darkTheme : lightTheme;
});
