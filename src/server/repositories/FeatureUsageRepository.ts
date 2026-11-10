import { Inject, Service } from 'typedi';
import { IsNull, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { ExternalGameImportJob, HexplorerStudy, Player, PlayerAccountDiscord, PlayerLittleGolemAccount } from '../../shared/app/models/index.js';

const LAST_PLAYERS_LIMIT = 5;

export type FeatureUsageLastPlayer = {
    pseudo: string;
    slug: string;
    publicId: string;
    lastUsedAt: Date;
};

/**
 * How many players use some features, for admin stats.
 * When we know who used a feature and when, also returns last players who used it.
 */
export type FeatureUsage = {
    pronouns: { count: number };
    littleGolemAccounts: { count: number };
    discordAccounts: { count: number, lastPlayers: FeatureUsageLastPlayer[] };
    countryFlags: { count: number, distinctFlags: number };
    avatars: { count: number, lastPlayers: FeatureUsageLastPlayer[] };
    externalGameImports: { count: number, players: number, lastPlayers: FeatureUsageLastPlayer[] };
    hexplorerStudies: { count: number, players: number, lastPlayers: FeatureUsageLastPlayer[] };
};

@Service()
export default class FeatureUsageRepository
{
    constructor(
        @Inject('Repository<Player>')
        private playerRepository: Repository<Player>,

        @Inject('Repository<PlayerLittleGolemAccount>')
        private playerLittleGolemAccountRepository: Repository<PlayerLittleGolemAccount>,

        @Inject('Repository<PlayerAccountDiscord>')
        private playerAccountDiscordRepository: Repository<PlayerAccountDiscord>,

        @Inject('Repository<ExternalGameImportJob>')
        private externalGameImportJobRepository: Repository<ExternalGameImportJob>,

        @Inject('Repository<HexplorerStudy>')
        private hexplorerStudyRepository: Repository<HexplorerStudy>,
    ) {}

    async getFeatureUsage(): Promise<FeatureUsage>
    {
        const [
            pronouns,
            littleGolemAccounts,
            discordAccounts,
            discordLastPlayers,
            countryFlags,
            distinctFlags,
            avatars,
            avatarsLastPlayers,
            externalGameImports,
            externalGameImportsPlayers,
            externalGameImportsLastPlayers,
            hexplorerStudies,
            hexplorerStudiesPlayers,
            hexplorerStudiesLastPlayers,
        ] = await Promise.all([
            this.playerRepository.countBy({ pronouns: Not(IsNull()) }),
            this.playerLittleGolemAccountRepository.count(),
            this.playerAccountDiscordRepository.count(),
            this.lastPlayers(this.playerAccountDiscordRepository.createQueryBuilder('e'), 'e.createdAt'),
            this.playerRepository.countBy({ countryFlag: Not(IsNull()) }),
            this.countDistinct(this.playerRepository.createQueryBuilder('e'), 'e.countryFlag'),
            this.playerRepository.countBy({ avatarPath: Not(IsNull()) }),
            this.lastPlayers(
                this.playerRepository.createQueryBuilder('player').where('player.avatarPath is not null and player.avatarUpdatedAt is not null'),
                'player.avatarUpdatedAt',
                false,
            ),
            this.externalGameImportJobRepository.count(),
            this.countDistinct(this.externalGameImportJobRepository.createQueryBuilder('e'), 'e.requestedById'),
            this.lastPlayers(this.externalGameImportJobRepository.createQueryBuilder('e'), 'e.createdAt', 'requestedBy'),
            this.hexplorerStudyRepository.count(),
            this.countDistinct(this.hexplorerStudyRepository.createQueryBuilder('e'), 'e.authorId'),
            this.lastPlayers(this.hexplorerStudyRepository.createQueryBuilder('e'), 'e.createdAt', 'author'),
        ]);

        return {
            pronouns: { count: pronouns },
            littleGolemAccounts: { count: littleGolemAccounts },
            discordAccounts: { count: discordAccounts, lastPlayers: discordLastPlayers },
            countryFlags: { count: countryFlags, distinctFlags },
            avatars: { count: avatars, lastPlayers: avatarsLastPlayers },
            externalGameImports: { count: externalGameImports, players: externalGameImportsPlayers, lastPlayers: externalGameImportsLastPlayers },
            hexplorerStudies: { count: hexplorerStudies, players: hexplorerStudiesPlayers, lastPlayers: hexplorerStudiesLastPlayers },
        };
    }

    /**
     * Count distinct non null values of a column.
     */
    private async countDistinct<T extends object>(qb: SelectQueryBuilder<T>, column: string): Promise<number>
    {
        const result = await qb
            .select(`count(distinct ${column})`, 'count')
            .getRawOne<{ count: string }>()
        ;

        return parseInt(result?.count ?? '0', 10);
    }

    /**
     * Last distinct players who used a feature, most recent first.
     *
     * @param dateColumn Date when the feature has been used, e.g "e.createdAt"
     * @param playerRelation Relation to join player on, or false if query is already on player
     */
    private async lastPlayers<T extends object>(
        qb: SelectQueryBuilder<T>,
        dateColumn: string,
        playerRelation: false | string = 'player',
    ): Promise<FeatureUsageLastPlayer[]> {
        if (playerRelation) {
            qb.innerJoin(`${qb.alias}.${playerRelation}`, 'player');
        }

        const rows = await qb
            .select('player.pseudo', 'pseudo')
            .addSelect('player.slug', 'slug')
            .addSelect('player.publicId', 'publicId')
            .addSelect(`max(${dateColumn})`, 'lastUsedAt')
            .groupBy('player.id')
            .orderBy('lastUsedAt', 'DESC')
            .limit(LAST_PLAYERS_LIMIT)
            .getRawMany<FeatureUsageLastPlayer>()
        ;

        return rows.map(row => ({ ...row, lastUsedAt: new Date(row.lastUsedAt) }));
    }
}
