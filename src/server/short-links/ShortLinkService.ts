import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { ShortLink } from '../../shared/app/models/index.js';
import { generateShortLinkSlug, isValidShortLinkSlug, isValidShortLinkTarget } from '../../shared/app/short-links/shortLinks.js';

export class ShortLinkError extends Error {}

@Service()
export default class ShortLinkService
{
    constructor(
        @Inject('Repository<ShortLink>')
        private shortLinkRepository: Repository<ShortLink>,
    ) {}

    /**
     * @throws {ShortLinkError}
     */
    async create(target: string, slug?: string): Promise<ShortLink> {
        if (!isValidShortLinkTarget(target)) {
            throw new ShortLinkError(`Invalid target "${target}", must be a relative url like "/puzzles/xxx"`);
        }

        if (slug !== undefined) {
            if (!isValidShortLinkSlug(slug)) {
                throw new ShortLinkError('Slug must be 1 to 32 characters among lowercase letters, digits, "-" and "_"');
            }

            if (await this.shortLinkRepository.existsBy({ slug })) {
                throw new ShortLinkError(`Slug "${slug}" already exists`);
            }
        } else {
            do {
                slug = generateShortLinkSlug();
            } while (await this.shortLinkRepository.existsBy({ slug }));
        }

        const shortLink = this.shortLinkRepository.create({ slug, target });

        return await this.shortLinkRepository.save(shortLink);
    }

    /**
     * Returns target and counts the click.
     */
    async use(slug: string): Promise<null | string> {
        const shortLink = await this.shortLinkRepository.findOneBy({ slug });

        if (shortLink === null) {
            return null;
        }

        await this.shortLinkRepository.update({ slug }, {
            clicks: () => 'clicks + 1',
            lastUsedAt: new Date(),
        });

        return shortLink.target;
    }

    async list(): Promise<ShortLink[]> {
        return await this.shortLinkRepository.find({ order: { createdAt: 'DESC' } });
    }
}
