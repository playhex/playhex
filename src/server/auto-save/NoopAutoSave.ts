import { AutoSaveInterface } from './AutoSaveInterface.js';

export class NoopAutoSave<T> implements AutoSaveInterface<T>
{
    constructor(
        private entity: T,
    ) {}

    async save(): Promise<T>
    {
        return this.entity;
    }
}
