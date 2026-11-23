import { Authorized, BadRequestError, Body, Get, JsonController, NotFoundError, Param, Post } from 'routing-controllers';
import { Service } from 'typedi';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import ShortLinkService, { ShortLinkError } from './ShortLinkService.js';
import { ROLE_ADMIN } from '../services/roles.js';

class CreateShortLinkInput
{
    @IsString()
    @IsNotEmpty()
    target: string;

    @IsOptional()
    @IsString()
    slug?: string;
}

@JsonController()
@Service()
export default class ShortLinkController
{
    constructor(
        private shortLinkService: ShortLinkService,
    ) {}

    @Get('/api/short-links/:slug')
    async use(
        @Param('slug') slug: string,
    ): Promise<{ target: string }> {
        const target = await this.shortLinkService.use(slug);

        if (target === null) {
            throw new NotFoundError('Short link not found');
        }

        return { target };
    }

    @Post('/api/admin/short-links')
    @Authorized(ROLE_ADMIN)
    async create(
        @Body() input: CreateShortLinkInput,
    ): Promise<{ slug: string, target: string }> {
        try {
            const { slug, target } = await this.shortLinkService.create(input.target, input.slug);

            return { slug, target };
        } catch (e) {
            if (e instanceof ShortLinkError) {
                throw new BadRequestError(e.message);
            }

            throw e;
        }
    }
}
