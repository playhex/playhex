import { Inject, Service } from 'typedi';
import { In, Repository } from 'typeorm';
import type { Move } from '@playhex/move-notation';
import { Player, Puzzle, PuzzleMonitorUncoveredLine, PuzzleMonitorUncoveredLineIgnored } from '../../shared/app/models/index.js';
import { isUncoveredLine } from '../../shared/app/puzzles/puzzleTree.js';
import { deserializeMoves } from '../../shared/app/movesSerializer.js';

/**
 * Max lines returned to author, most played first.
 */
const MAX_LINES = 5000;

@Service()
export default class PuzzleMonitorUncoveredLineRepository
{
    constructor(
        @Inject('Repository<PuzzleMonitorUncoveredLine>')
        private uncoveredLineRepository: Repository<PuzzleMonitorUncoveredLine>,

        @Inject('Repository<PuzzleMonitorUncoveredLineIgnored>')
        private ignoredRepository: Repository<PuzzleMonitorUncoveredLineIgnored>,
    ) {}

    /**
     * Logs this line once per player, ignored if already logged.
     */
    async log(puzzle: Puzzle, player: Player, line: string): Promise<void>
    {
        await this.uncoveredLineRepository
            .createQueryBuilder()
            .insert()
            .values({ puzzle: { id: puzzle.id }, player: { id: player.id }, line })
            .orIgnore()
            .execute()
        ;
    }

    /**
     * Number of players who played each line, most played first,
     * and whether author marked it as false positive.
     */
    async countByLine(puzzle: Puzzle): Promise<{ line: string, count: number, ignored: boolean }[]>
    {
        const rows = await this.uncoveredLineRepository
            .createQueryBuilder('uncoveredLine')
            .leftJoin(PuzzleMonitorUncoveredLineIgnored, 'ignored', 'ignored.puzzleId = uncoveredLine.puzzleId AND ignored.line = uncoveredLine.line')
            .select('uncoveredLine.line', 'line')
            .addSelect('count(*)', 'count')
            .addSelect('max(ignored.id)', 'ignoredId')
            .where('uncoveredLine.puzzleId = :puzzleId', { puzzleId: puzzle.id })
            .groupBy('uncoveredLine.line')
            .orderBy('count', 'DESC')
            .addOrderBy('line')
            .limit(MAX_LINES)
            .getRawMany<{ line: string, count: number | string, ignoredId: null | number }>()
        ;

        return rows.map(({ line, count, ignoredId }) => ({ line, count: Number(count), ignored: ignoredId !== null }));
    }

    /**
     * Deletes logs and false positive marks of lines no longer uncovered by puzzle tree,
     * e.g once author covered them.
     */
    async deleteCoveredLines(puzzle: Puzzle): Promise<void>
    {
        const where = { puzzle: { id: puzzle.id } };
        const lines = new Set([
            ...(await this.uncoveredLineRepository.find({ select: { line: true }, where })),
            ...(await this.ignoredRepository.find({ select: { line: true }, where })),
        ].map(({ line }) => line));

        const coveredLines = [...lines].filter(line => !isUncoveredLine(puzzle.tree, deserializeMoves<Move>(line)));

        if (coveredLines.length === 0) {
            return;
        }

        await this.uncoveredLineRepository.delete({ ...where, line: In(coveredLines) });
        await this.ignoredRepository.delete({ ...where, line: In(coveredLines) });
    }

    /**
     * Marks line as false positive, or not anymore.
     * Line is still logged, to check later whether it was actually a serious one.
     */
    async setIgnored(puzzle: Puzzle, line: string, ignored: boolean): Promise<void>
    {
        if (!ignored) {
            await this.ignoredRepository.delete({ puzzle: { id: puzzle.id }, line });
            return;
        }

        await this.ignoredRepository
            .createQueryBuilder()
            .insert()
            .values({ puzzle: { id: puzzle.id }, line })
            .orIgnore()
            .execute()
        ;
    }
}
