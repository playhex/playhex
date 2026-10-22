import logger from '../services/logger.js';

/**
 * How long a finished run is kept, for client polling.
 * Running it again later is fast anyway, as engines results are cached by position.
 */
const FINISHED_RUN_TTL_MS = 10 * 60_000;

export type BackgroundRunState = {
    status: 'running' | 'done' | 'failed';

    /**
     * Set when status is failed.
     */
    error?: string;
};

/**
 * Long tasks run in background, e.g many positions to analyze,
 * keeping their state in memory for client polling, by key.
 */
export class BackgroundRuns<State extends BackgroundRunState>
{
    private runs = new Map<string, State>();

    /**
     * @param name For logs
     */
    constructor(
        private name: string,
    ) {}

    /**
     * Current state of a run, or null if not started, or expired.
     * A failed run is returned once, then forgotten so it can be started again.
     */
    getState(key: string): null | State
    {
        const state = this.runs.get(key) ?? null;

        if (state?.status === 'failed') {
            this.runs.delete(key);
        }

        return state;
    }

    /**
     * Starts a run in background, or returns current one if already running.
     *
     * @param task Updates state while running (progress, result), state status is then set by this method.
     */
    start(key: string, initialState: State, task: (state: State) => Promise<void>): State
    {
        const existing = this.getState(key);

        if (existing !== null) {
            return existing;
        }

        const state = initialState;

        this.runs.set(key, state);

        task(state)
            .then(() => {
                state.status = 'done';
            })
            .catch(e => {
                logger.warning(`${this.name} failed`, { message: e?.message });
                state.status = 'failed';
                state.error = e?.message ?? 'Unknown error';
            })
            .finally(() => {
                setTimeout(() => {
                    if (this.runs.get(key) === state) {
                        this.runs.delete(key);
                    }
                }, FINISHED_RUN_TTL_MS).unref();
            })
        ;

        return state;
    }
}
