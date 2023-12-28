import { themeSwitcherDispatcher } from '@client/DarkThemeSwitcher';

export type Theme = {
    colorA: number;
    colorB: number;
    colorEmpty: number;
    strokeColor: number;
    textColor: number;
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
    colorA: colorFromCss('--bs-danger'),
    colorB: colorFromCss('--bs-primary'),
    colorEmpty: colorFromCss('--bs-light-bg-subtle'),
    strokeColor: colorFromCss('--bs-dark-bg-subtle'),
    textColor: colorFromCss('--bs-body-color'),
};

themeSwitcherDispatcher.on('themeSwitched', () => {
    currentTheme.colorA = colorFromCss('--bs-danger');
    currentTheme.colorB = colorFromCss('--bs-primary');
    currentTheme.colorEmpty = colorFromCss('--bs-light-bg-subtle');
    currentTheme.strokeColor = colorFromCss('--bs-dark-bg-subtle');
    currentTheme.textColor = colorFromCss('--bs-body-color');
});
