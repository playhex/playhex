export interface DataInconsistenciesCheckerInterface
{
    getDescription(): string;

    run(): Promise<string[]>;
}
