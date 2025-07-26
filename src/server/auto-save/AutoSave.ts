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
    /**
     * Currently running callback.
     * If null, next save() will run callback immediately.
     * If defined, next save() will run callback once this current is done.
     */
    private currentPromise: null | Promise<T> = null;

    /**
     * Queued callback, to run after current callback.
     * If null, next save() will queue callback here.
     * If defined, all next save() will return this same queued callback.
     */
    private nextPromise: null | Promise<T> = null;

    private isCallbackRunning = false;

    constructor(
        /**
         * Callback that persist a given entity
         */
        private callback: () => Promise<T>,
    ) {}

    save(): Promise<T>
    {
        if (this.nextPromise !== null) {
            return this.nextPromise;
        }

        if (this.currentPromise === null) {
            this.currentPromise = this.doRunCallback();

            return this.currentPromise;
        }

        this.nextPromise = (async () => {
            await this.currentPromise;

            this.currentPromise = this.nextPromise;
            this.nextPromise = null;

            return this.doRunCallback();
        })();

        return this.nextPromise;
    }

    private async doRunCallback(): Promise<T>
    {
        if (this.isCallbackRunning) {
            throw new Error('A callback is already running');
        }

        this.isCallbackRunning = true;

        const result = await this.callback();

        this.isCallbackRunning = false;

        return result;
    }
}
