export const colorAverage = (colorA: number, colorB: number, coef: number): number => {
    const rA = colorA >> 16;
    const gA = (colorA & 0x00ff00) >> 8;
    const bA = colorA & 0x0000ff;

    const rB = colorB >> 16;
    const gB = (colorB & 0x00ff00) >> 8;
    const bB = colorB & 0x0000ff;

    const coefA = 1 - coef;
    const coefB = coef;

    return (rA * coefA + rB * coefB) << 16
        | (gA * coefA + gB * coefB) << 8
        | bA * coefA + bB * coefB
    ;
};

export const lighten = (color: number, coef: number): number => colorAverage(color, 0xffffff, coef);
export const darken = (color: number, coef: number): number => colorAverage(color, 0x000000, coef);
