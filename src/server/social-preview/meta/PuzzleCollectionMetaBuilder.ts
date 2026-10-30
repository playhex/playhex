import { Service } from 'typedi';
import type { Puzzle, PuzzleCollection } from '../../../shared/app/models/index.js';
import { withSiteName, type SocialMeta, type SocialMetaContext } from '../SocialMeta.js';
import AbstractEntityMetaBuilder from './AbstractEntityMetaBuilder.js';
import PuzzleMetaBuilder from './PuzzleMetaBuilder.js';
import { breadcrumbJsonLd, joinTitle, playerName, puzzleCollectionUrl } from './metaUtils.js';

export type PuzzleCollectionPageData = {
    collection: PuzzleCollection;
    puzzles: Puzzle[];
};

/**
 * How many puzzles are displayed on collection image.
 */
export const COLLECTION_IMAGE_PUZZLES = 4;

@Service()
export default class PuzzleCollectionMetaBuilder extends AbstractEntityMetaBuilder<PuzzleCollectionPageData>
{
    readonly imageType = 'puzzle-collections';

    constructor(
        private puzzleMetaBuilder: PuzzleMetaBuilder,
    ) {
        super();
    }

    imageId({ collection }: PuzzleCollectionPageData): string
    {
        return collection.publicId;
    }

    /**
     * Also changes when one of displayed puzzles is reordered or edited.
     */
    imageVersion({ collection, puzzles }: PuzzleCollectionPageData): string
    {
        return [
            collection.updatedAt?.getTime() ?? 0,
            puzzles.length,
            ...puzzles
                .slice(0, COLLECTION_IMAGE_PUZZLES)
                .map(puzzle => `${puzzle.publicId}:${this.puzzleMetaBuilder.imageVersion(puzzle)}`),
        ].join('-');
    }

    buildMeta({ collection, puzzles }: PuzzleCollectionPageData, context: SocialMetaContext): Partial<SocialMeta>
    {
        const { t } = context;
        const url = puzzleCollectionUrl(collection, context);
        const lines = [t('social_preview.puzzle_collection.n_puzzles', { count: puzzles.length })];

        if (collection.author) {
            lines.push(t('social_preview.by', { author: playerName(collection.author) }));
        }

        const image = this.image({ collection, puzzles }, context, collection.name);

        return {
            title: withSiteName(joinTitle(
                collection.name,
                collection.author && t('social_preview.puzzle_collection.hex_puzzles_by', { author: playerName(collection.author) }),
            )),
            description: lines.join(' · '),
            image,
            noindex: puzzles.length === 0,
            jsonLd: [
                {
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    name: collection.name,
                    url,
                    image: image.url,
                    mainEntity: {
                        '@type': 'ItemList',
                        numberOfItems: puzzles.length,
                        itemListElement: puzzles.map((puzzle, index) => ({
                            '@type': 'ListItem',
                            position: index + 1,
                            name: this.puzzleMetaBuilder.title(puzzle, context),
                            url: this.puzzleMetaBuilder.url(puzzle, context),
                        })),
                    },
                },
                breadcrumbJsonLd([
                    { name: t('puzzles.list_title'), url: `${context.baseUrl}/puzzles` },
                    { name: collection.name, url },
                ]),
            ],
        };
    }
}
