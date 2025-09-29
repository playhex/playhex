export interface DataInconsistenciesCheckerInterface
{
    getDescription(): string;

    /**
     * Perform checks.
     * Returns empty for no inconsistencies,
     * or returns a list of error reason, one for every inconsistency.
     */
    run(): Promise<string[]>;
}
