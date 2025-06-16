/**
 * An agent that safely persist a given entity into memory.
 * Should prevent persisting twice at same time, deadlocks, ...
 */
export interface AutoSaveInterface<T>
{
    /**
     * Persist entity now.
     * Return a promise that resolves when entity is persisted.
     */
    save(): Promise<T>;
}
