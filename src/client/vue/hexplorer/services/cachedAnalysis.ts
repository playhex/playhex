export class LocalStorageCache<T>
{
    private cache: { [positionHash: string]: T } = {};

    // In-flight computations, so concurrent calls for the same key share a single request
    // instead of racing past the (not-yet-resolved) cache check and firing twice.
    private pending: { [positionHash: string]: Promise<T> } = {};

    constructor(
        private cacheName: string,
    ) {
        this.loadCache();
    }

    async getItem(key: string, compute: () => Promise<T>): Promise<T>
    {
        if (key in this.cache) {
            return this.cache[key];
        }

        if (!(key in this.pending)) {
            this.pending[key] = compute().finally(() => {
                delete this.pending[key];
            });
        }

        return this.cache[key] = await this.pending[key];
    }

    private loadCache(): void
    {
        const cachedRaw = localStorage?.getItem(this.cacheName);
        this.cache = cachedRaw ? JSON.parse(cachedRaw) : {};
    }

    persistCache(): void
    {
        localStorage?.setItem(this.cacheName, JSON.stringify(this.cache));
    }
}
