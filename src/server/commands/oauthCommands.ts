import crypto from 'node:crypto';
import hexProgram from './hexProgram.js';
import { AppDataSource, appDataSourceInitialized } from '../data-source.js';
import { OAuthClient } from '../../shared/app/models/index.js';
import { DEVICE_CODE_GRANT_TYPE } from '../oauth/provider.js';
import { isClientOnlyScope, isOAuthScope, parseScope } from '../../shared/app/oauth.js';

const collect = (value: string, previous: string[]): string[] => [...previous, value];

hexProgram
    .command('oauth:create-client')
    .description('Register a third-party application allowed to use the api on behalf of players. Prints client id and secret.')
    .requiredOption('--name <name>', 'Application name, displayed to players')
    .requiredOption('--author <author>', 'Application author, displayed to players')
    .requiredOption('--logo <url>', 'Application logo url')
    .option('--website <url>', 'Application website')
    .option('--description <description>', 'Short description, displayed to players')
    .option('--redirect-uri <url>', 'Allowed redirect uri, can be repeated', collect, [] as string[])
    .option('--public', 'Public client (mobile app, SPA, CLI...): no client secret, must use PKCE')
    .option('--device', 'Allow device flow, for applications without browser (CLI, bots...)')
    .option('--client-credentials', 'Allow the application to get tokens for itself, not on behalf of a player (client_credentials grant), e.g a Discord bot. Use with --scope')
    .option('--scope <scopes>', 'Space separated scopes the application may request, e.g "games:analyze" for a Discord bot', 'openid offline_access read write')
    .action(async ({ name, author, logo, website, description, redirectUri, public: isPublic, device, clientCredentials, scope }) => {
        await appDataSourceInitialized;

        if (redirectUri.length === 0 && !device && !clientCredentials) {
            console.error('Either pass at least one --redirect-uri, --device, or --client-credentials');
            process.exitCode = 1;
            return;
        }

        if (clientCredentials && isPublic) {
            console.error('A public client cannot use --client-credentials, it needs a client secret');
            process.exitCode = 1;
            return;
        }

        const scopes = parseScope(scope);
        const unknownScopes = scopes.filter(s => !isOAuthScope(s));

        if (unknownScopes.length > 0) {
            console.error(`Unknown scopes: ${unknownScopes.join(', ')}`);
            process.exitCode = 1;
            return;
        }

        // Players can never grant these scopes: an application asking them during player authorization
        // would be prompted consent again and again. So keep them for applications only acting on their own.
        const clientOnlyScopes = scopes.filter(isClientOnlyScope);

        if (clientOnlyScopes.length > 0 && (!clientCredentials || redirectUri.length > 0 || device)) {
            console.error(`Scopes ${clientOnlyScopes.join(', ')} are only for an application acting on its own: use --client-credentials, without --redirect-uri nor --device. Create a separate application to act on behalf of players.`);
            process.exitCode = 1;
            return;
        }

        // No refresh token for client_credentials only applications: they request a new token when expired
        const grantTypes = redirectUri.length > 0 || device ? ['refresh_token'] : [];

        if (clientCredentials) {
            grantTypes.push('client_credentials');
        }

        if (redirectUri.length > 0) {
            grantTypes.push('authorization_code');
        }

        if (device) {
            grantTypes.push(DEVICE_CODE_GRANT_TYPE);
        }

        const client = new OAuthClient();

        client.clientId = crypto.randomBytes(12).toString('base64url');
        client.clientSecret = isPublic ? null : crypto.randomBytes(48).toString('base64url');
        client.name = name;
        client.author = author;
        client.logoUri = logo;
        client.websiteUri = website ?? null;
        client.description = description ?? null;
        client.redirectUris = redirectUri;
        client.grantTypes = grantTypes;
        client.allowedScopes = scopes.join(' ');

        await AppDataSource.getRepository(OAuthClient).save(client);

        console.log('Application created.');
        console.log(`client_id:     ${client.clientId}`);
        console.log(`client_secret: ${client.clientSecret ?? '(none, public client, must use PKCE)'}`);
        console.log(`grant types:   ${grantTypes.join(', ')}`);
        console.log(`scopes:        ${client.allowedScopes}`);
    })
;

hexProgram
    .command('oauth:generate-jwks')
    .description('Generate a signing key for OAuth id_tokens, to put in OIDC_JWKS env var')
    .action(() => {
        const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
        const jwk = {
            ...privateKey.export({ format: 'jwk' }),
            kid: crypto.randomBytes(8).toString('hex'),
            use: 'sig',
            alg: 'RS256',
        };

        console.log(`OIDC_JWKS='${JSON.stringify({ keys: [jwk] })}'`);
    })
;
