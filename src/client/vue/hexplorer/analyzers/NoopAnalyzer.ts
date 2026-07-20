import { type AnalysisOutput } from '../../../../shared/app/hexplorer.js';
import { AnalyzerInterface } from './AnalyzerInterface.js';

export class NoopAnalyzer implements AnalyzerInterface
{
    analyzePosition(): Promise<AnalysisOutput>
    {
        return Promise.resolve({});
    }

    getName(): string
    {
        return '--';
    }
}
