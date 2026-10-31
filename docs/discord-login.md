# Log in with Discord

Players can log in to PlayHex with their Discord account:

- A player who is not logged in can use "Log in with Discord", below the login and signup forms.
  - If the Discord account is already linked to a PlayHex account, the player is logged in to that account.
  - Otherwise a new account is created with the Discord display name and avatar. The current guest is upgraded, so they keep their games. If the pseudo is already taken, a suffix is added (`pseudo-2`, `pseudo-3`, ...).
- A player who already has an account can link their Discord account in **Settings > Account > Discord**, then log in with either Discord or their password.
- An account created with Discord has no password. The player can set one in **Settings > Security**. A Discord account can only be unlinked once the PlayHex account has a password.

The link is private: it is never shown on the profile page.

Code: `src/server/discord/`, OAuth2 authorization code flow with the `identify` scope only (Discord id, username, display name, avatar). No email and no bot.
Linked accounts are stored in table `player_account_discord`.

Optional: if `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` or `BASE_URL` is empty, all Discord buttons are hidden and the `/auth/discord` routes do not exist.

## Creating the Discord application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and log in with a Discord account.
   Any Discord account works. For production, use an account (or a [Team](https://discord.com/developers/teams)) that the PlayHex maintainers can access.

2. Click the **New Application** button at the top right.
   Enter a name (players will see it on the Discord authorization page, e.g. "PlayHex"), accept the Developer Terms of Service, then click **Create**.

3. In the left menu, open **General Information** (optional but recommended):
   - **App Icon**: upload the PlayHex logo. Players see it on the authorization page.
   - **Description**, **Terms of Service URL**, **Privacy Policy URL**: optional.
   - Click **Save Changes**.

4. In the left menu, open **OAuth2**:
   - **Client information** section:
     - **Client ID**: click **Copy**. This is `DISCORD_CLIENT_ID`.
     - **Client Secret**: click **Reset Secret**, confirm, then copy the secret. This is `DISCORD_CLIENT_SECRET`.
       Discord shows it only once: if you lose it, reset it again and update `.env`.
   - **Redirects** section: click **Add Redirect** and enter:

     ```
     <BASE_URL>/auth/discord/callback
     ```

     It must exactly match the `BASE_URL` of the server, including protocol and port, for example:
     - production: `https://playhex.org/auth/discord/callback`
     - local development: `http://localhost:3000/auth/discord/callback`

     You can add several redirects to one application, e.g. production and local development.
   - Click **Save Changes**.

You don't need the **OAuth2 URL Generator**, **Bot** or **Installation** pages: PlayHex builds the authorization URL itself.

## Configuring PlayHex

In `.env`:

``` bash
# Must be the same base url as the one used in Discord redirect
BASE_URL=https://playhex.org

DISCORD_CLIENT_ID=123456789012345678
DISCORD_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Then rebuild the client and restart the server:
- `DISCORD_LOGIN_ENABLED` is computed from these variables at client build time (`vite.config.ts`), to show or hide Discord buttons.
- The server reads them at startup.

## Checking it works

1. Log out, go to `/login`, and click **Log in with Discord**.
2. Discord asks you to authorize the application, then redirects back to PlayHex, logged in to a new account named after your Discord display name.
3. In **Settings > Account > Discord**, the linked Discord username is displayed.

Common errors:

- Discord shows **Invalid OAuth2 redirect_uri**: the redirect added in the Discord application does not exactly match `<BASE_URL>/auth/discord/callback`. Check the protocol (`http`/`https`), port and trailing slash.
- PlayHex shows **Log in with Discord failed**: the session was lost between leaving for Discord and coming back (state mismatch), or the client secret is wrong. Check the server logs for `Error while logging in with Discord`.
