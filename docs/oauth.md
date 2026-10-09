# OAuth / OpenID Connect

Lets third-party applications (bots, mobile apps, stats sites, CLIs...) use the api on behalf of a player.

Code: `src/server/oauth/`, built on [oidc-provider](https://github.com/panva/node-oidc-provider).
Example requests: `http/oauth/`.

## Registering an application

Applications are added manually, in table `oauth_client`, or with:

``` bash
pnpm hex oauth:create-client \
    --name "My App" \
    --author "Someone" \
    --logo https://example.com/logo.png \
    --website https://example.com \
    --redirect-uri https://example.com/oauth/callback

# --public: no client secret (mobile apps, SPA, CLI), PKCE required
# --device: allow device flow (applications without browser)
```

Disable an application with `enabled = 0`: all its tokens stop working immediately.

## Endpoints

Issuer is `BASE_URL/oidc`, see `BASE_URL/oidc/.well-known/openid-configuration`.

| Endpoint | Path |
|---|---|
| Authorization | `/oidc/auth` |
| Token | `/oidc/token` |
| User info | `/oidc/me` |
| Device authorization | `/oidc/device/auth` |
| Device code input (player) | `/oidc/device` |
| Revocation | `/oidc/token/revocation` |
| Introspection | `/oidc/token/introspection` |

Player-facing pages are Vue pages under `/oauth/` (`/oauth/interaction/:uid`, consent),
and the "Connected applications" panel in settings.

## Flows

- Authorization code, with client secret (confidential clients) or PKCE (public clients)
- Device flow (`urn:ietf:params:oauth:grant-type:device_code`)
- Refresh token: with `offline_access` scope, or always with device flow.
  Rotated on each use for public clients, and for confidential clients only once 70% of its lifetime has passed
  (oidc-provider default). Applications must always store the `refresh_token` returned in the response, if any.

Implicit and hybrid flows are disabled.

## Scopes

| Scope | Access |
|---|---|
| `openid` | Player public id (`sub` claim) |
| `read` | All `GET` api routes, as the player. Adds `pseudo`, `slug`, `is_guest` claims. |
| `write` | All api routes, as the player (create games, play moves, chat, settings...). Implies `read`. |
| `offline_access` | Get a refresh token |

Some routes can never be called with an access token, even with `write`:
authentication (`/api/auth/*` except `GET /api/auth/me`), admin, AI workers, push subscriptions,
OAuth management, linking external accounts, acknowledging moderation actions.
See `src/server/oauth/oauthApiPolicy.ts`.

Guests can authorize applications. Their public id is kept if they sign up later, so tokens keep working.

## Using the api

``` http
GET /api/auth/me
Authorization: Bearer <access_token>
```

Socket.io: pass the token in handshake auth (custom parser, see `src/shared/app/socketCustomParser.ts`):

``` js
io('https://playhex.org', { auth: { token: accessToken }, parser: CustomParser, transports: ['websocket'] });
```

From a browser, `transports: ['websocket']` is required: socket.io http long-polling is not allowed cross-origin.

Socket events that act (`move`, `premove`, `joinGame`, `sendChat`...) require `write` scope.

## CORS

Nothing to configure per application, origins come from registered applications `redirectUris`:

- `/api/*`: allowed for origins in `CORS_ALLOWED_ORIGINS`, and origins of enabled applications redirect uris
  (cached 1 minute, see `src/server/oauth/oauthClientOrigins.ts`). Other sites cannot fetch the api from a browser.
  Never with credentials, so browsers never send PlayHex session cookies cross-origin:
  access is granted by the Bearer token only.
- `/oidc/*` (token, refresh, revocation, userinfo): allowed from the origins of the application `redirectUris`,
  for public clients only. Confidential clients must exchange tokens server-side, never expose their secret in a browser.
  See `clientBasedCORS` in `src/server/oauth/provider.ts`.

`CORS_ALLOWED_ORIGINS` still applies to other routes.

## Storage

- `oauth_client`: registered applications
- `oauth_payload`: all other oidc-provider models (grants, tokens, codes, sessions, interactions),
  through `TypeOrmOidcAdapter`. Expired rows are purged hourly.

Access tokens are opaque and stored in database, so revocation is immediate.
Tokens do not expire when the player logs out of PlayHex, only when revoked from settings or expired.

## Configuration

- `OIDC_COOKIE_KEYS`: keys to sign OAuth cookies
- `OIDC_JWKS`: key to sign id_tokens, generate one with `pnpm hex oauth:generate-jwks`

Both fall back to random keys in development, with a warning.
