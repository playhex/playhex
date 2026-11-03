import { Service } from 'typedi';
import type { Dataset, WithContext } from 'schema-dts';
import type { ExportGamesDataManifest } from '../../../shared/app/ExportGamesDataManifest.js';
import type { SocialMeta, SocialMetaContext } from '../SocialMeta.js';
import type { SocialMetaBuilderInterface } from './SocialMetaBuilderInterface.js';

/**
 * Adds Dataset json-ld to /export-games-data.
 * Title, description and image are set by StaticPageMetaBuilder.
 */
@Service()
export default class ExportGamesDataMetaBuilder implements SocialMetaBuilderInterface<ExportGamesDataManifest>
{
    datasetJsonLd(manifest: ExportGamesDataManifest, context: SocialMetaContext): WithContext<Dataset>
    {
        const { baseUrl } = context;

        return {
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'PlayHex.org Hex games',
            description: 'Hex games played on PlayHex.org. Can be player vs player, or player vs bot. Ranked or Friendly. Variable board size. All games are ended, either by regular victory, resign, timeout or forfeited.',
            alternateName: ['PlayHex games archive'],
            url: `${baseUrl}/export-games-data`,
            creator: {
                '@type': 'Organization',
                '@id': `${baseUrl}/#organization`,
                name: 'PlayHex',
                url: `${baseUrl}/`,
            },
            isAccessibleForFree: true,
            license: 'https://creativecommons.org/publicdomain/zero/1.0/',
            keywords: ['board game', 'hex'],
            temporalCoverage: '2023-11-22/..',
            datePublished: manifest.generated_at,
            dateModified: manifest.generated_at,
            version: manifest.generated_at.split('.')[0],
            distribution: [{
                '@type': 'DataDownload',
                encodingFormat: 'application/gzip',
                contentUrl: `${baseUrl}${manifest.filename}`,
            }],
        };
    }

    buildMeta(manifest: ExportGamesDataManifest, context: SocialMetaContext): Partial<SocialMeta>
    {
        return {
            jsonLd: [this.datasetJsonLd(manifest, context)],
        };
    }
}
