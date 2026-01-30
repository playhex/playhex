import { ConcentricalRings } from './ConcentricalRings.js';
import { CustomShadingPattern } from './CustomShadingPattern.js';
import { Height5Lines } from './Height5Lines.js';
import { NullShadingPattern } from './NullShadingPattern.js';
import { ShadingPatternInterface } from './ShadingPatternInterface.js';
import { SingleRing } from './SingleRing.js';
import { TriColorCheckerboard } from './TriColorCheckerboard.js';

export const allShadingPatterns = [
    null,
    'tricolor_checkerboard',
    'concentrical_rings',
    'height_5_lines',
    'single_ring',
    'custom',
] as const;

export type ShadingPatternType = typeof allShadingPatterns[number];

export const createShadingPattern = (name: ShadingPatternType, options: unknown): ShadingPatternInterface => {
    if (!allShadingPatterns.includes(name)) {
        return new NullShadingPattern();
    }

    switch (name) {
        case 'tricolor_checkerboard': return new TriColorCheckerboard();
        case 'concentrical_rings': return new ConcentricalRings();
        case 'height_5_lines': return new Height5Lines();
        case 'single_ring': return new SingleRing();
        case 'custom': return new CustomShadingPattern(options as string);
        case null: return new NullShadingPattern();
    }
};
