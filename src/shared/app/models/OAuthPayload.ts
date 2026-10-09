import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Generic storage for oidc-provider models:
 * Session, Interaction, AuthorizationCode, DeviceCode, AccessToken, RefreshToken, Grant...
 */
@Entity('oauth_payload')
export default class OAuthPayload
{
    @PrimaryColumn({ type: String, length: 255 })
    id: string;

    /**
     * oidc-provider model name, i.e "AccessToken", "Grant".
     */
    @PrimaryColumn({ type: String, length: 32 })
    kind: string;

    @Column({ type: 'json' })
    payload: { [key: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

    @Column({ type: String, length: 255, nullable: true })
    @Index()
    grantId: null | string = null;

    @Column({ type: String, length: 64, nullable: true })
    @Index()
    userCode: null | string = null;

    @Column({ type: String, length: 255, nullable: true })
    @Index()
    uid: null | string = null;

    /**
     * Player public id, to list grants of a player.
     */
    @Column({ type: String, length: 36, nullable: true })
    @Index()
    accountId: null | string = null;

    @Column({ type: Date, precision: 3, nullable: true })
    @Index()
    expiresAt: null | Date = null;

    @Column({ type: Date, precision: 3, nullable: true })
    consumedAt: null | Date = null;
}
