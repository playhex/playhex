import { AutoSaveInterface } from './AutoSaveInterface.js';

export class NoopAutoSave<T> implements AutoSaveInterface<T>
{
    constructor(
        private entity: T,
    ) {}

    // eslint-disable-next-line require-await, @typescript-eslint/require-await
    async save(): Promise<T>
    {
        return this.entity;
    }
}
