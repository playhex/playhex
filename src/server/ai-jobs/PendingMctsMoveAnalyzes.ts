import { Service } from 'typedi';

/**
 * PlayHex games and external games have their own publicIds,
 * scoped to not mix them.
 */
export type PendingMctsMoveAnalyzesScope = 'game' | 'external';

/**
 * Moves deep analyzes (tree search) being processed,
 * to not process same move twice,
 * i.e when overlapping ranges are requested, by same player or not.
 */
@Service()
export default class PendingMctsMoveAnalyzes
{
    private pending = new Set<string>();

    private key(scope: PendingMctsMoveAnalyzesScope, publicId: string, moveIndex: number): string
    {
        return `${scope}:${publicId}:${moveIndex}`;
    }

    isPending(scope: PendingMctsMoveAnalyzesScope, publicId: string, moveIndex: number): boolean
    {
        return this.pending.has(this.key(scope, publicId, moveIndex));
    }

    /**
     * Mark moves as being processed, except ones already being processed.
     * Synchronous, so two requests cannot reserve same move.
     *
     * @returns Moves newly reserved, caller must process them, then release them.
     */
    reserve(scope: PendingMctsMoveAnalyzesScope, publicId: string, moveIndexes: number[]): number[]
    {
        const reserved: number[] = [];

        for (const moveIndex of moveIndexes) {
            const key = this.key(scope, publicId, moveIndex);

            if (this.pending.has(key)) {
                continue;
            }

            this.pending.add(key);
            reserved.push(moveIndex);
        }

        return reserved;
    }

    release(scope: PendingMctsMoveAnalyzesScope, publicId: string, moveIndexes: number | number[]): void
    {
        for (const moveIndex of ([] as number[]).concat(moveIndexes)) {
            this.pending.delete(this.key(scope, publicId, moveIndex));
        }
    }
}
