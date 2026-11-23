import { Container } from 'typedi';
import hexProgram from '../commands/hexProgram.js';
import { appDataSourceInitialized } from '../data-source.js';
import ShortLinkService, { ShortLinkError } from './ShortLinkService.js';
import { SHORT_LINK_PATH_PREFIX } from '../../shared/app/short-links/shortLinks.js';

const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';

hexProgram
    .command('short-link:create')
    .description('Create a short link "/s/<slug>" redirecting to a relative url')
    .argument('<target>', 'Relative url, e.g "/puzzles/xxxx-xxx-xx"')
    .option('--slug <slug>', 'Custom slug, e.g "ju". Random 4 lowercase letters if not set')
    .action(async (target, { slug }) => {
        await appDataSourceInitialized;

        try {
            const shortLink = await Container.get(ShortLinkService).create(target, slug);

            console.log(`${baseUrl}${SHORT_LINK_PATH_PREFIX}${shortLink.slug} => ${shortLink.target}`);
        } catch (e) {
            if (e instanceof ShortLinkError) {
                console.error(e.message);
                process.exitCode = 1;
                return;
            }

            throw e;
        }
    })
;

hexProgram
    .command('short-link:list')
    .description('List short links with their clicks count')
    .action(async () => {
        await appDataSourceInitialized;

        const shortLinks = await Container.get(ShortLinkService).list();

        console.table(shortLinks.map(({ slug, target, clicks, lastUsedAt, createdAt }) => ({
            link: baseUrl + SHORT_LINK_PATH_PREFIX + slug,
            target,
            clicks,
            lastUsedAt: lastUsedAt?.toISOString() ?? null,
            createdAt: createdAt.toISOString(),
        })));
    })
;
