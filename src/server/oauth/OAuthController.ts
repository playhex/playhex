import { Inject, Service } from 'typedi';
import { Delete, Get, HttpError, JsonController, NotFoundError, Param, Post, Req, Res } from 'routing-controllers';
import type { Request, Response } from 'express';
import { In, MoreThan, Repository } from 'typeorm';
import { errors, type Interaction } from 'oidc-provider';
import { AuthenticatedPlayer } from '../controllers/http/middlewares.js';
import { OAuthClient, OAuthPayload, Player } from '../../shared/app/models/index.js';
import { getOidcProvider, OAUTH_PAGES_PREFIX } from './provider.js';
import { revokeGrant } from './TypeOrmOidcAdapter.js';
import { parseScope, type OAuthClientInfo, type OAuthConnectedApplication, type OAuthInteractionDetails } from '../../shared/app/oauth.js';

const getRequestedScope = (interaction: Interaction): string => {
    const { scope } = interaction.params;

    return typeof scope === 'string' ? scope : '';
};

const toClientInfo = (client: OAuthClient): OAuthClientInfo => ({
    clientId: client.clientId,
    name: client.name,
    logoUri: client.logoUri,
    author: client.author,
    websiteUri: client.websiteUri,
    description: client.description,
});

/**
 * Endpoints used by the Vue pages during OAuth flows (consent),
 * and to manage connected applications.
 *
 * Interaction endpoints must be under /oauth/interaction/:uid
 * because oidc-provider interaction cookie path is restricted to the interaction page url.
 */
@JsonController()
@Service()
export default class OAuthController
{
    constructor(
        @Inject('Repository<OAuthClient>')
        private oauthClientRepository: Repository<OAuthClient>,

        @Inject('Repository<OAuthPayload>')
        private oauthPayloadRepository: Repository<OAuthPayload>,
    ) {}

    @Get(`${OAUTH_PAGES_PREFIX}/interaction/:uid/details`)
    async getInteraction(
        @Param('uid') uid: string,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<OAuthInteractionDetails> {
        const interaction = await this.loadInteraction(uid, req, res);
        const client = await this.oauthClientRepository.findOneBy({ clientId: String(interaction.params.client_id) });

        if (client === null) {
            throw new NotFoundError('Application not found');
        }

        const deviceCode = typeof interaction.deviceCode === 'string'
            ? await getOidcProvider().DeviceCode.find(interaction.deviceCode)
            : undefined
        ;

        return {
            client: toClientInfo(client),
            scopes: parseScope(getRequestedScope(interaction)),
            // Stored normalized, display it as on the device, with default oidc-provider mask "****-****"
            userCode: deviceCode?.userCode?.replace(/^(.{4})(.{4})$/, '$1-$2'),
        };
    }

    /**
     * Current player authorizes the application.
     * Completes both login and consent prompts.
     */
    @Post(`${OAUTH_PAGES_PREFIX}/interaction/:uid/confirm`)
    async confirm(
        @AuthenticatedPlayer() player: Player,
        @Param('uid') uid: string,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<{ redirectTo: string }> {
        const provider = getOidcProvider();
        const interaction = await this.loadInteraction(uid, req, res);
        const accountId = player.publicId;
        const clientId = String(interaction.params.client_id);

        let grant = interaction.grantId
            ? await provider.Grant.find(interaction.grantId)
            : undefined
        ;

        // Grant from a previously logged in player
        if (grant && grant.accountId !== accountId) {
            grant = undefined;
        }

        if (!grant) {
            grant = new provider.Grant({ accountId, clientId });
        }

        const requestedScope = getRequestedScope(interaction);

        if (requestedScope) {
            grant.addOIDCScope(requestedScope);
        }

        const missingOIDCClaims = interaction.prompt.details.missingOIDCClaims;

        if (Array.isArray(missingOIDCClaims)) {
            grant.addOIDCClaims(missingOIDCClaims);
        }

        const grantId = await grant.save();

        const redirectTo = await provider.interactionResult(req, res, {
            login: { accountId },
            consent: { grantId },
        }, { mergeWithLastSubmission: false });

        return { redirectTo };
    }

    @Post(`${OAUTH_PAGES_PREFIX}/interaction/:uid/abort`)
    async abort(
        @Param('uid') uid: string,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<{ redirectTo: string }> {
        await this.loadInteraction(uid, req, res);

        const redirectTo = await getOidcProvider().interactionResult(req, res, {
            error: 'access_denied',
            error_description: 'Player denied access',
        }, { mergeWithLastSubmission: false });

        return { redirectTo };
    }

    /**
     * Applications the current player authorized.
     */
    @Get('/api/oauth/connected-applications')
    async getConnectedApplications(
        @AuthenticatedPlayer() player: Player,
    ): Promise<OAuthConnectedApplication[]> {
        const grants = await this.findGrants(player);
        const clients = await this.oauthClientRepository.findBy({
            clientId: In([...new Set(grants.map(grant => String(grant.payload.clientId)))]),
        });

        const applications: OAuthConnectedApplication[] = [];

        for (const client of clients) {
            const clientGrants = grants.filter(grant => grant.payload.clientId === client.clientId);
            const scopes = new Set<string>();

            for (const grant of clientGrants) {
                const openid = grant.payload.openid as undefined | { scope?: string };

                for (const scope of parseScope(openid?.scope)) {
                    scopes.add(scope);
                }
            }

            applications.push({
                ...toClientInfo(client),
                scopes: [...scopes],
                authorizedAt: new Date(Math.min(...clientGrants.map(grant => Number(grant.payload.iat) * 1000))),
            });
        }

        return applications.sort((a, b) => b.authorizedAt.getTime() - a.authorizedAt.getTime());
    }

    /**
     * Revoke all grants, access tokens and refresh tokens given by current player to an application.
     */
    @Delete('/api/oauth/connected-applications/:clientId')
    async revokeConnectedApplication(
        @AuthenticatedPlayer() player: Player,
        @Param('clientId') clientId: string,
    ): Promise<void> {
        const grants = (await this.findGrants(player))
            .filter(grant => grant.payload.clientId === clientId)
        ;

        if (grants.length === 0) {
            throw new NotFoundError('No authorization for this application');
        }

        for (const grant of grants) {
            await revokeGrant(grant.id);
        }
    }

    private async findGrants(player: Player): Promise<OAuthPayload[]>
    {
        return await this.oauthPayloadRepository.findBy({
            kind: 'Grant',
            accountId: player.publicId,
            expiresAt: MoreThan(new Date()),
        });
    }

    private async loadInteraction(uid: string, req: Request, res: Response)
    {
        try {
            const interaction = await getOidcProvider().interactionDetails(req, res);

            if (interaction.uid !== uid) {
                throw new HttpError(400, 'Interaction mismatch');
            }

            return interaction;
        } catch (e) {
            if (e instanceof errors.SessionNotFound) {
                throw new HttpError(410, 'oauth_interaction_expired');
            }

            throw e;
        }
    }
}
