/**
 * Runs async callbacks one at a time per key.
 * Used to apply ladder mutations sequentially per ladder.
 */
export class KeyedMutex
{
    private tails = new Map<string | number, Promise<unknown>>();

    async runExclusive<T>(key: string | number, callback: () => Promise<T>): Promise<T>
    {
        const previous = this.tails.get(key) ?? Promise.resolve();
        const current = previous.then(callback, callback);
        const tail = current.catch(() => undefined);

        this.tails.set(key, tail);

        try {
            return await current;
        } finally {
            if (this.tails.get(key) === tail) {
                this.tails.delete(key);
            }
        }
    }
}
