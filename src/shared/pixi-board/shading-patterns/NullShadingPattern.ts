import { ShadingPatternInterface } from './ShadingPatternInterface.js';

export class NullShadingPattern implements ShadingPatternInterface
{
    calc(): number
    {
        return 0;
    }
}
