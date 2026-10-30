import { Service } from 'typedi';
import type { Puzzle } from '../../../shared/app/models/index.js';
import { withSiteName, type JsonLd, type SocialMeta, type SocialMetaContext } from '../SocialMeta.js';
import AbstractEntityMetaBuilder from './AbstractEntityMetaBuilder.js';
import { boardsizeString, breadcrumbJsonLd, joinTitle, personJsonLd, playerName, puzzleCollectionUrl } from './metaUtils.js';

@Service()
export default class PuzzleMetaBuilder extends AbstractEntityMetaBuilder<Puzzle>
{
    readonly imageType = 'puzzles';

    imageId(puzzle: Puzzle): string
    {
        return puzzle.publicId;
    }

    imageVersion(puzzle: Puzzle): string
    {
        return String(puzzle.updatedAt?.getTime() ?? 0);
    }

    url(puzzle: Puzzle, context: SocialMetaContext): string
    {
        return `${context.baseUrl}/puzzles/${encodeURIComponent(puzzle.publicId)}`;
    }

    title(puzzle: Puzzle, context: SocialMetaContext): string
    {
        return puzzle.title || context.t('social_preview.puzzle.default_title');
    }

    /**
     * "Red to play and win"
     */
    toPlay(puzzle: Puzzle, context: SocialMetaContext): string
    {
        return context.t(puzzle.playerColor === 0 ? 'social_preview.puzzle.red_to_play' : 'social_preview.puzzle.blue_to_play');
    }

    /**
     * "Red to play and win · 9×9 · by Alice".
     * Never tells anything about the solution.
     */
    private summary(puzzle: Puzzle, context: SocialMetaContext): string
    {
        const parts = [
            this.toPlay(puzzle, context),
            `Hex ${boardsizeString(puzzle.boardsize)}`,
        ];

        if (puzzle.author) {
            parts.push(context.t('social_preview.by', { author: playerName(puzzle.author) }));
        }

        return parts.join(' · ');
    }

    buildMeta(puzzle: Puzzle, context: SocialMetaContext): Partial<SocialMeta>
    {
        const { t } = context;
        const title = this.title(puzzle, context);
        const url = this.url(puzzle, context);
        const image = this.image(puzzle, context, title);
        const description = this.summary(puzzle, context);

        const creativeWork: JsonLd = {
            '@context': 'https://schema.org',
            '@type': 'CreativeWork',
            name: title,
            url,
            image: image.url,
            description,
            isAccessibleForFree: true,
            learningResourceType: 'Puzzle',
        };

        if (puzzle.author) {
            creativeWork.author = personJsonLd(puzzle.author, context);
        }

        if (puzzle.publishedAt) {
            creativeWork.datePublished = puzzle.publishedAt.toISOString();
        }

        const breadcrumb = [{ name: t('puzzles.list_title'), url: `${context.baseUrl}/puzzles` }];

        if (puzzle.collection) {
            creativeWork.isPartOf = {
                '@type': 'CollectionPage',
                name: puzzle.collection.name,
                url: puzzleCollectionUrl(puzzle.collection, context),
            };

            breadcrumb.push({ name: puzzle.collection.name, url: puzzleCollectionUrl(puzzle.collection, context) });
        }

        breadcrumb.push({ name: title, url });

        const hexPuzzleBy = puzzle.author
            ? t('social_preview.puzzle.hex_puzzle_by', { author: playerName(puzzle.author) })
            : null
        ;

        return {
            title: withSiteName(puzzle.title ? joinTitle(puzzle.title, hexPuzzleBy) : (hexPuzzleBy ?? title)),
            description,
            type: 'article',
            image,

            // Drafts can be shared and played, but are not indexed
            noindex: !puzzle.published,

            jsonLd: [creativeWork, breadcrumbJsonLd(breadcrumb)],
        };
    }
}
