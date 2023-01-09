export type ThemeName = 'light' | 'dark';

export type Theme = {
    colorA: number;
    colorB: number;
    colorEmpty: number;
    strokeColor: number,
};

export const themes: {[key in ThemeName]: Theme} = {
    light: {
        colorA: 0xff8888,
        colorB: 0x8888ff,
        colorEmpty: 0xcccccc,
        strokeColor: 0xffffff,
    },
    dark: {
        colorA: 0xcc4444,
        colorB: 0x4444cc,
        colorEmpty: 0x333333,
        strokeColor: 0x080808,
    },
};

export const currentThemeName: ThemeName = 'dark';
export const currentTheme: Theme = themes[currentThemeName];
