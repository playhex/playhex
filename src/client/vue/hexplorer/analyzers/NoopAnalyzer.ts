import { AnalysisOutput, AnalyzerInterface } from './AnalyzerInterface.js';

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
