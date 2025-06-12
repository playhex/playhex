import { AutoSaveInterface } from './AutoSaveInterface.js';

/**
 * Prevent persisting an in-memory entity twice at same time.
 * Make sure all persists are called one by one.
 * If another persist is running, wait for it before persist again.
 * If a persist is already waiting, returns same promise.
 *
 * There should be one persistence agent per loaded in-memory entity.
 *
 * Example use:
 * ```
 * const autoSave = new AutoSave(async () => repository.persist(entity));
 * ```
 *
 * - Case 1:
 * ```
 * await autoSave.persist(); // persist now
 * ```
 *
 * - Case 2:
 * ```
 * autoSave.persist(); // persist now
 * entity.field = 'updated value'; // probable entity change
 * autoSave.persist(); // persisted twice, sequencially, after first persist is done. Returns a promise that resolves when this second persist is done.
 * ```
 *
 * - Case 3:
 * ```
 * autoSave.persist(); // persist now
 * autoSave.persist(); // persisted twice, sequencially, after first persist is done
 * autoSave.persist(); // won't persist a third time, returns same promise as second one.
 * ```
 */
export class AutoSave<T> implements AutoSaveInterface<T>
{
    private currentPromise: Promise<T> | null = null;
    private nextCallQueued = false;
    private nextPromise: Promise<T> | null = null;
    private resolveNext: ((value: T) => void) | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private rejectNext: ((reason?: any) => void) | null = null;

    constructor(
        /**
         * Callback that persist a given entity
         */
        private callback: () => Promise<T>,
    ) {}

    save(): Promise<T>
    {
        if (!this.currentPromise) {
            this.currentPromise = this.runCallback();
            return this.currentPromise;
        }

        if (!this.nextCallQueued) {
            this.nextCallQueued = true;
            this.nextPromise = new Promise<T>((resolve, reject) => {
                this.resolveNext = resolve;
                this.rejectNext = reject;
            });
        }

        return this.nextPromise!;
    }

    private async runCallback(): Promise<T>
    {
        try {
            const result = await this.callback();
            return result;
        } catch (err) {
            throw err;
        } finally {
            this.currentPromise = null;

            if (this.nextCallQueued) {
                this.nextCallQueued = false;

                try {
                    const result = await this.runCallback();
                    this.resolveNext?.(result);
                } catch (err) {
                    this.rejectNext?.(err);
                } finally {
                    this.nextPromise = null;
                    this.resolveNext = null;
                    this.rejectNext = null;
                }
            }
        }
    }
}
