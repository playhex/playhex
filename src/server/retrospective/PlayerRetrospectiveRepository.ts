import { Inject, Service } from 'typedi';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Player, PlayerRetrospective } from '../../shared/app/models/index.js';
import { areRetrospectivesListed, isRetrospectiveYearOver, isValidRetrospectiveShareCode } from '../../shared/app/retrospective/retrospectiveRules.js';
import type { PlayerRetrospectiveData, PlayerRetrospectiveSummary, RetrospectiveLink } from '../../shared/app/retrospective/retrospectiveTypes.js';

/**
 * Read published retrospectives.
 * A retrospective is visible only when generated, published, not hidden (hidden covers bots, guests, incomplete years...), and with its share code:
 * only its player lists them (once year is over), and decides to share them.
 * With its share code, current year retrospective is visible too.
 */
@Service()
export default class PlayerRetrospectiveRepository
{
    constructor(
        @Inject('Repository<PlayerRetrospective>')
        private playerRetrospectiveRepository: Repository<PlayerRetrospective>,
    ) {}

    /**
     * Must only be returned to the player itself: contains share codes.
     */
    async findPublishedSummaries(player: Player, now: Date = new Date()): Promise<PlayerRetrospectiveSummary[]>
    {
        if (!player.id || !areRetrospectivesListed(now)) {
            return [];
        }

        const retrospectives = await this.playerRetrospectiveRepository.find({
            select: { year: true, shareCode: true, games1v1: true },
            where: {
                playerId: player.id,
                hidden: false,
                publishedAt: Not(IsNull()),
            },
            order: { year: 'DESC' },
        });

        return retrospectives
            .filter(retrospective => isRetrospectiveYearOver(retrospective.year, now))
            .map(({ year, shareCode, games1v1 }) => ({ year, shareCode, games1v1 }))
        ;
    }

    /**
     * Previous and next year retrospectives, if listed (see findPublishedSummaries()).
     * Must only be returned to the player itself: contains share codes.
     */
    async findNeighbours(player: Player, year: number, now: Date = new Date()): Promise<{ previous: null | RetrospectiveLink, next: null | RetrospectiveLink }>
    {
        if (!player.id || !areRetrospectivesListed(now)) {
            return { previous: null, next: null };
        }

        const retrospectives = await this.playerRetrospectiveRepository.find({
            select: { year: true, shareCode: true },
            where: {
                playerId: player.id,
                year: In([year - 1, year + 1]),
                hidden: false,
                publishedAt: Not(IsNull()),
            },
        });

        const link = (y: number): null | RetrospectiveLink => {
            const retrospective = retrospectives.find(r => r.year === y && isRetrospectiveYearOver(y, now));

            return retrospective ? { year: retrospective.year, shareCode: retrospective.shareCode } : null;
        };

        return { previous: link(year - 1), next: link(year + 1) };
    }

    /**
     * @returns Data, and date of computation to use as a version (i.e social preview image).
     */
    async findPublished(player: Player, year: number, shareCode: string): Promise<null | { data: PlayerRetrospectiveData, computedAt: Date }>
    {
        if (!player.id || !isValidRetrospectiveShareCode(shareCode)) {
            return null;
        }

        const retrospective = await this.playerRetrospectiveRepository.findOneBy({
            playerId: player.id,
            year,
            hidden: false,
            publishedAt: Not(IsNull()),
        });

        // Compared here, case sensitive whatever the database collation
        if (retrospective === null || retrospective.shareCode !== shareCode) {
            return null;
        }

        // Player may have changed pseudo since generation
        retrospective.data.player = {
            publicId: player.publicId,
            pseudo: player.pseudo,
            slug: player.slug,
            isBot: player.isBot,
        };

        return { data: retrospective.data, computedAt: retrospective.computedAt };
    }
}
