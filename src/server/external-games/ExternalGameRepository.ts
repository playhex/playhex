import { Inject, Service } from 'typedi';
import { In, IsNull, Repository } from 'typeorm';
import { ExternalGame, ExternalGameAnalyze, ExternalGameImportJob, Player, PlayerLittleGolemAccount } from '../../shared/app/models/index.js';
import type SearchExternalGamesParameters from '../../shared/app/SearchExternalGamesParameters.js';

const DEFAULT_PAGE_SIZE = 20;

@Service()
export default class ExternalGameRepository
{
    constructor(
        @Inject('Repository<ExternalGame>')
        private externalGameRepository: Repository<ExternalGame>,

        @Inject('Repository<ExternalGameAnalyze>')
        private externalGameAnalyzeRepository: Repository<ExternalGameAnalyze>,

        @Inject('Repository<ExternalGameImportJob>')
        private externalGameImportJobRepository: Repository<ExternalGameImportJob>,

        @Inject('Repository<PlayerLittleGolemAccount>')
        private playerLittleGolemAccountRepository: Repository<PlayerLittleGolemAccount>,
    ) {}

    async findLittleGolemAccount(player: Player): Promise<null | PlayerLittleGolemAccount>
    {
        if (!player.id) {
            return null;
        }

        return await this.playerLittleGolemAccountRepository.findOneBy({ playerId: player.id });
    }

    /**
     * Link a Little Golem account, replacing the one already linked if any.
     */
    async saveLittleGolemAccount(player: Player, plid: number, pseudo: string): Promise<PlayerLittleGolemAccount>
    {
        if (!player.id) {
            throw new Error('Player has no id');
        }

        const account = new PlayerLittleGolemAccount();

        account.playerId = player.id;
        account.plid = plid;
        account.pseudo = pseudo;

        return await this.playerLittleGolemAccountRepository.save(account);
    }

    async deleteLittleGolemAccount(player: Player): Promise<void>
    {
        if (!player.id) {
            return;
        }

        await this.playerLittleGolemAccountRepository.delete({ playerId: player.id });
    }

    async findByPublicId(publicId: string): Promise<null | ExternalGame>
    {
        return await this.externalGameRepository.findOne({
            where: { publicId },
            relations: { createdBy: true },
        });
    }

    /**
     * Returns which of these external ids are already imported.
     */
    async findExistingExternalIds(externalIds: string[]): Promise<Set<string>>
    {
        const existing = new Set<string>();
        const chunkSize = 500;

        for (let i = 0; i < externalIds.length; i += chunkSize) {
            const games = await this.externalGameRepository.find({
                select: { externalId: true },
                where: { externalId: In(externalIds.slice(i, i + chunkSize)) },
            });

            games.forEach(game => existing.add(game.externalId));
        }

        return existing;
    }

    /**
     * Latest imported first.
     */
    async search(params: SearchExternalGamesParameters): Promise<{ results: ExternalGame[], count: number }>
    {
        const pageSize = params.paginationPageSize ?? DEFAULT_PAGE_SIZE;
        const page = params.paginationPage ?? 0;

        const where = params.externalPlayerId
            ? [
                { player0ExternalId: params.externalPlayerId },
                { player1ExternalId: params.externalPlayerId },
            ]
            : {}
        ;

        const [results, count] = await this.externalGameRepository.findAndCount({
            select: {
                id: true,
                publicId: true,
                externalId: true,
                boardsize: true,
                player0Name: true,
                player1Name: true,
                player0ExternalId: true,
                player1ExternalId: true,
                player0Rating: true,
                player1Rating: true,
                winner: true,
                outcome: true,
                startedAt: true,
                endedAt: true,
                source: true,
                sourceUrl: true,
                event: true,
                createdAt: true,
            },
            where,
            order: { createdAt: 'desc', id: 'desc' },
            take: pageSize,
            skip: page * pageSize,
        });

        return { results, count };
    }

    async save(externalGame: ExternalGame): Promise<ExternalGame>
    {
        return await this.externalGameRepository.save(externalGame);
    }

    async findAnalyze(externalGame: ExternalGame): Promise<null | ExternalGameAnalyze>
    {
        return await this.externalGameAnalyzeRepository.findOneBy({
            externalGameId: externalGame.id,
        });
    }

    async saveAnalyze(externalGame: ExternalGame, externalGameAnalyze: ExternalGameAnalyze): Promise<void>
    {
        externalGameAnalyze.externalGame = externalGame;

        await this.externalGameAnalyzeRepository.save(externalGameAnalyze);
    }

    /**
     * Mark analyzes still processing as errored, so they can be requested again.
     * Called on server start: analyzes in progress are kept in memory, so lost on restart.
     */
    async failUnfinishedAnalyzes(): Promise<number>
    {
        const result = await this.externalGameAnalyzeRepository.update({ endedAt: IsNull() }, {
            endedAt: new Date(),
            analyze: null,
        });

        return result.affected ?? 0;
    }

    async saveImportJob(job: ExternalGameImportJob): Promise<ExternalGameImportJob>
    {
        return await this.externalGameImportJobRepository.save(job);
    }

    async findLastImportJob(player: Player): Promise<null | ExternalGameImportJob>
    {
        return await this.externalGameImportJobRepository.findOne({
            where: { requestedBy: { id: player.id } },
            order: { createdAt: 'desc', id: 'desc' },
        });
    }

    /**
     * Oldest pending job, to process next.
     */
    async findNextPendingImportJob(): Promise<null | ExternalGameImportJob>
    {
        return await this.externalGameImportJobRepository.findOne({
            where: { status: 'pending' },
            relations: { requestedBy: true },
            order: { createdAt: 'asc', id: 'asc' },
        });
    }

    /**
     * Jobs interrupted by a server restart are processed again.
     */
    async resetRunningImportJobs(): Promise<number>
    {
        const result = await this.externalGameImportJobRepository.update({ status: 'running' }, {
            status: 'pending',
        });

        return result.affected ?? 0;
    }
}
