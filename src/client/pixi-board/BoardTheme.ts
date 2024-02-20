export type Theme = {
    colorA: number; // --bs-danger
    colorB: number; // --bs-primary
    colorEmpty: number; // --bs-light-bg-subtle
    strokeColor: number; // --bs-dark-bg-subtle
    textColor: number; // --bs-body-color
};

const dark: Theme = {
    colorA: 0xdc3545,
    colorB: 0x0d6efd,
    colorEmpty: 0x343a40,
    strokeColor: 0x1a1d20,
    textColor: 0xdee2e6,
};

const light: Theme = {
    colorA: 0xdc3545,
    colorB: 0x0d6efd,
    colorEmpty: 0xfcfcfd,
    strokeColor: 0xced4da,
    textColor: 0x212529,
};

export const themes = {
    dark,
    light,
};
