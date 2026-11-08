import { playerGender } from '../../../shared/app/playerPronouns.js';
import { Service } from 'typedi';
import type { LadderDto } from '../../../shared/app/models/LadderDto.js';
import { withSiteName, type SocialMeta, type SocialMetaContext } from '../SocialMeta.js';
import AbstractEntityMetaBuilder from './AbstractEntityMetaBuilder.js';
import { breadcrumbJsonLd, formatLongDuration, joinTitle, longDuration, playerName } from './metaUtils.js';

@Service()
export default class LadderMetaBuilder extends AbstractEntityMetaBuilder<LadderDto>
{
    readonly imageType = 'king-of-the-hill';

    imageId(ladderDto: LadderDto): string
    {
        return ladderDto.ladder.slug;
    }

    /**
     * Also changes with displayed reign duration.
     */
    imageVersion(ladderDto: LadderDto, now = new Date()): string
    {
        const reign = ladderDto.currentReign;

        if (!reign) {
            return `none-${ladderDto.standings.length}`;
        }

        const { unit, count } = longDuration(now.getTime() - reign.startedAt.getTime());

        return [
            reign.player.publicId,
            playerGender(reign.player),
            reign.defenses,
            `${count}${unit}`,
            ladderDto.standings.length,
        ].join('-');
    }

    url(ladderDto: LadderDto, context: SocialMetaContext): string
    {
        return `${context.baseUrl}/king-of-the-hill/${encodeURIComponent(ladderDto.ladder.slug)}`;
    }

    /**
     * "King of the Hill · Blitz", or just ladder name when it already says it.
     */
    title(ladderDto: LadderDto, context: SocialMetaContext): string
    {
        const kingOfTheHill = context.t('ladder.title', { context: playerGender(ladderDto.currentReign?.player) });
        const defaultTitle = context.t('ladder.title');
        const { name } = ladderDto.ladder;

        const titleIndex = name.toLowerCase().indexOf(defaultTitle.toLowerCase());

        return titleIndex >= 0
            ? name.slice(0, titleIndex) + kingOfTheHill + name.slice(titleIndex + defaultTitle.length)
            : joinTitle(kingOfTheHill, name)
        ;
    }

    summaryLines(ladderDto: LadderDto, context: SocialMetaContext, now = new Date()): string[]
    {
        const { t } = context;
        const reign = ladderDto.currentReign;
        const lines: string[] = [];

        if (reign) {
            lines.push(t('social_preview.ladder.king', { player: playerName(reign.player), context: playerGender(reign.player) }));
            lines.push(t('social_preview.ladder.reign', {
                duration: formatLongDuration(now.getTime() - reign.startedAt.getTime(), t),
                count: reign.defenses,
            }));
        } else {
            lines.push(t('ladder.no_king'));
        }

        lines.push(t('social_preview.ladder.n_players', { count: ladderDto.standings.length }));

        return lines;
    }

    buildMeta(ladderDto: LadderDto, context: SocialMetaContext): Partial<SocialMeta>
    {
        const { t } = context;
        const url = this.url(ladderDto, context);
        const title = this.title(ladderDto, context);

        return {
            title: withSiteName(title),
            description: this.summaryLines(ladderDto, context).join(' · '),
            image: this.image(ladderDto, context, title),
            jsonLd: [breadcrumbJsonLd([
                { name: t('ladder.title', { context: playerGender(ladderDto.currentReign?.player) }), url: `${context.baseUrl}/king-of-the-hill` },
                { name: ladderDto.ladder.name, url },
            ])],
        };
    }
}
