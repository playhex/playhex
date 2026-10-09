import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Third-party application allowed to use the api on behalf of players, through OAuth2 / OpenID Connect.
 * Inserted manually in database, or with `pnpm hex oauth:create-client`.
 */
@Entity('oauth_client')
export default class OAuthClient
{
    @PrimaryGeneratedColumn()
    id?: number;

    /**
     * Public identifier of the application, sent as "client_id".
     */
    @Column({ type: String, length: 64 })
    @Index({ unique: true })
    clientId: string;

    /**
     * Null for public clients (mobile apps, SPA, CLI...), which then must use PKCE.
     */
    @Column({ type: String, length: 128, nullable: true })
    clientSecret: null | string = null;

    /**
     * Displayed to players on the consent page.
     */
    @Column({ type: String, length: 64 })
    name: string;

    @Column({ type: String, length: 255 })
    logoUri: string;

    @Column({ type: String, length: 128 })
    author: string;

    @Column({ type: String, length: 255, nullable: true })
    websiteUri: null | string = null;

    @Column({ type: 'text', nullable: true })
    description: null | string = null;

    /**
     * Allowed callback urls, e.g ["https://example.com/oauth/callback"]
     */
    @Column({ type: 'json' })
    redirectUris: string[] = [];

    /**
     * Allowed grant types, among
     * "authorization_code", "refresh_token", "urn:ietf:params:oauth:grant-type:device_code"
     */
    @Column({ type: 'json' })
    grantTypes: string[] = ['authorization_code', 'refresh_token'];

    /**
     * Space separated scopes this application may request.
     */
    @Column({ type: String, length: 255, default: 'openid offline_access read write' })
    allowedScopes: string = 'openid offline_access read write';

    @Column({ default: true })
    enabled: boolean = true;

    @Column({ type: Date, precision: 3, default: () => 'current_timestamp(3)' })
    createdAt: Date = new Date();
}
