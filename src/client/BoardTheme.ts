import { themeSwitcherDispatcher } from './DarkThemeSwitcher';

export type Theme = {
    colorA: number;
    colorB: number;
    colorEmpty: number;
    strokeColor: number,
};

const rootStyles = window.getComputedStyle(document.body);

const colorFromCss = (color: string): number => {
    let colorStr = rootStyles.getPropertyValue(color);
    let tokens: null | RegExpMatchArray;

    if (null !== (tokens = colorStr.match(/^#(.)(.)(.)$/))) {
        const [, r, g, b] = tokens;
        colorStr = '#' + r + r + g + g + b + b;
    }

    return parseInt(colorStr.substring(1), 16);
};

export const currentTheme: Theme = {
    colorA: colorFromCss('--player-a-color'),
    colorB: colorFromCss('--player-b-color'),
    colorEmpty: colorFromCss('--bs-light-bg-subtle'),
    strokeColor: colorFromCss('--bs-dark-bg-subtle'),
};

themeSwitcherDispatcher.on('themeSwitched', () => {
    currentTheme.colorA = colorFromCss('--player-a-color');
    currentTheme.colorB = colorFromCss('--player-b-color');
    currentTheme.colorEmpty = colorFromCss('--bs-light-bg-subtle');
    currentTheme.strokeColor = colorFromCss('--bs-dark-bg-subtle');
});
