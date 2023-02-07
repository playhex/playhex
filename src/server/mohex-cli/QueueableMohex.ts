import Mohex from './Mohex';

type MohexCommand<T> = (mohex: Mohex) => Promise<T>;
type Task<T> = {
    command: MohexCommand<T>,
    resolve: (value: T) => void,
    reject: (reason?: unknown) => void,
};

/**
 * Run commands to Mohex sequentially.
 */
export default class QueueableMohex
{
    private tasks: Task<unknown>[] = [];
    private running = false;

    constructor(
        private mohex: Mohex,
    ) {}

    private start(): void
    {
        if (this.running) {
            return;
        }

        this.running = true;

        this.executeNextTask();
    }

    private async executeNextTask(): Promise<void>
    {
        const task = this.tasks.shift();

        if (!task) {
            this.running = false;
            return;
        }

        try {
            task.resolve(await task.command(this.mohex));
        } catch (e) {
            task.reject(e);
        }

        this.executeNextTask();
    }

    async queueCommand<T>(command: MohexCommand<T>): Promise<T>
    {
        const promise = new Promise<T>((resolve, reject) => {
            const task: Task<T> = {
                command,
                resolve,
                reject,
            };

            this.tasks.push(task);
        });

        this.start();

        return promise;
    }
}
