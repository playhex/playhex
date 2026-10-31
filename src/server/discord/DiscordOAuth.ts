import { Service } from 'typedi';

const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, BASE_URL } = process.env;

const DISCORD_API = 'https://discord.com/api';

export const isDiscordLoginEnabled = (): boolean => !!DISCORD_CLIENT_ID && !!DISCORD_CLIENT_SECRET && !!BASE_URL;

export type DiscordUser = {
    id: string;
    username: string;
    global_name: null | string;
    avatar: null | string;
};

export class DiscordOAuthError extends Error {}

/**
 * Log in with Discord, OAuth2 authorization code flow.
 * Only "identify" scope: Discord id, username, display name and avatar.
 *
 * See https://discord.com/developers/docs/topics/oauth2
 */
@Service()
export default class DiscordOAuth
{
    private getRedirectUri(): string
    {
        return `${BASE_URL}/auth/discord/callback`;
    }

    getAuthorizeUrl(state: string): string
    {
        if (!isDiscordLoginEnabled()) {
            throw new DiscordOAuthError('Discord login is not configured');
        }

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: DISCORD_CLIENT_ID!,
            scope: 'identify',
            state,
            redirect_uri: this.getRedirectUri(),
            prompt: 'none',
        });

        return `https://discord.com/oauth2/authorize?${params.toString()}`;
    }

    /**
     * @throws {DiscordOAuthError}
     */
    async getUserFromCode(code: string): Promise<DiscordUser>
    {
        const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: DISCORD_CLIENT_ID!,
                client_secret: DISCORD_CLIENT_SECRET!,
                grant_type: 'authorization_code',
                code,
                redirect_uri: this.getRedirectUri(),
            }),
        });

        if (!tokenResponse.ok) {
            throw new DiscordOAuthError(`Discord token exchange failed: ${tokenResponse.status} ${await tokenResponse.text()}`);
        }

        const { access_token: accessToken } = await tokenResponse.json() as { access_token: string };

        const userResponse = await fetch(`${DISCORD_API}/users/@me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userResponse.ok) {
            throw new DiscordOAuthError(`Discord get user failed: ${userResponse.status} ${await userResponse.text()}`);
        }

        return await userResponse.json() as DiscordUser;
    }

    /**
     * Download Discord avatar, if user has one.
     */
    async fetchAvatar(user: DiscordUser): Promise<null | { buffer: Buffer, mimeType: string }>
    {
        if (!user.avatar) {
            return null;
        }

        const response = await fetch(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=512`);

        if (!response.ok) {
            throw new DiscordOAuthError(`Discord avatar download failed: ${response.status}`);
        }

        return {
            buffer: Buffer.from(await response.arrayBuffer()),
            mimeType: 'image/png',
        };
    }
}
