import { Container } from 'typedi';
import { Repository, LessThan } from 'typeorm';
import type { Adapter, AdapterPayload, ClientMetadata } from 'oidc-provider';
import { OAuthClient, OAuthPayload } from '../../shared/app/models/index.js';

const getPayloadRepository = (): Repository<OAuthPayload> => Container.get<Repository<OAuthPayload>>('Repository<OAuthPayload>');
const getClientRepository = (): Repository<OAuthClient> => Container.get<Repository<OAuthClient>>('Repository<OAuthClient>');

/**
 * Converts an OAuthClient row to oidc-provider client metadata.
 */
export const oauthClientToMetadata = (client: OAuthClient): ClientMetadata => {
    const canUseAuthorizationCode = client.grantTypes.includes('authorization_code');

    return {
        client_id: client.clientId,
        client_secret: client.clientSecret ?? undefined,
        token_endpoint_auth_method: client.clientSecret === null ? 'none' : 'client_secret_basic',
        redirect_uris: canUseAuthorizationCode ? client.redirectUris : [],
        grant_types: client.grantTypes,
        response_types: canUseAuthorizationCode ? ['code'] : [],
        scope: client.allowedScopes,
        client_name: client.name,
        logo_uri: client.logoUri,
        client_uri: client.websiteUri ?? undefined,
    };
};

/**
 * Stores oidc-provider models in database.
 * Clients are read from the hand-edited `oauth_client` table,
 * all other models are stored in the generic `oauth_payload` table.
 */
export class TypeOrmOidcAdapter implements Adapter
{
    constructor(
        private kind: string,
    ) {}

    async upsert(id: string, payload: AdapterPayload, expiresIn?: number): Promise<void>
    {
        if (this.kind === 'Client') {
            return;
        }

        const row: OAuthPayload = {
            id,
            kind: this.kind,
            payload: { ...payload },
            grantId: payload.grantId ?? null,
            userCode: payload.userCode ?? null,
            uid: payload.uid ?? null,
            accountId: payload.accountId ?? null,
            expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
            consumedAt: null,
        };

        await getPayloadRepository().upsert(row, ['id', 'kind']);
    }

    async find(id: string): Promise<AdapterPayload | undefined>
    {
        if (this.kind === 'Client') {
            const client = await getClientRepository().findOneBy({ clientId: id, enabled: true });

            return client ? oauthClientToMetadata(client) : undefined;
        }

        return this.findOneBy({ id });
    }

    findByUserCode(userCode: string): Promise<AdapterPayload | undefined>
    {
        return this.findOneBy({ userCode });
    }

    findByUid(uid: string): Promise<AdapterPayload | undefined>
    {
        return this.findOneBy({ uid });
    }

    async consume(id: string): Promise<void>
    {
        const row = await getPayloadRepository().findOneBy({ id, kind: this.kind });

        if (row === null) {
            return;
        }

        row.consumedAt = new Date();
        row.payload = { ...row.payload, consumed: Math.floor(row.consumedAt.getTime() / 1000) };

        await getPayloadRepository().save(row);
    }

    async destroy(id: string): Promise<void>
    {
        if (this.kind === 'Client') {
            return;
        }

        await getPayloadRepository().delete({ id, kind: this.kind });
    }

    /**
     * Called by oidc-provider on each model adapter, so only delete rows of this kind.
     */
    async revokeByGrantId(grantId: string): Promise<void>
    {
        await getPayloadRepository().delete({ grantId, kind: this.kind });
    }

    private async findOneBy(where: { id: string } | { userCode: string } | { uid: string }): Promise<AdapterPayload | undefined>
    {
        const row = await getPayloadRepository().findOneBy({ ...where, kind: this.kind });

        if (row === null) {
            return undefined;
        }

        if (row.expiresAt !== null && row.expiresAt.getTime() < Date.now()) {
            return undefined;
        }

        return row.payload;
    }
}

/**
 * Revoke a grant and all tokens and codes issued from it.
 */
export const revokeGrant = async (grantId: string): Promise<void> => {
    await getPayloadRepository().delete({ grantId });
    await getPayloadRepository().delete({ id: grantId, kind: 'Grant' });
};

/**
 * Remove expired rows. oidc-provider ignores them anyway, this only keeps the table small.
 */
export const purgeExpiredOAuthPayloads = async (): Promise<number> => {
    const result = await getPayloadRepository().delete({ expiresAt: LessThan(new Date()) });

    return result.affected ?? 0;
};
