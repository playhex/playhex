import crypto from 'node:crypto';
import hexProgram from './hexProgram.js';
import { AppDataSource } from '../data-source.js';
import { OAuthClient } from '../../shared/app/models/index.js';
import { DEVICE_CODE_GRANT_TYPE } from '../oauth/provider.js';

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
    .action(async ({ name, author, logo, website, description, redirectUri, public: isPublic, device }) => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        if (redirectUri.length === 0 && !device) {
            console.error('Either pass at least one --redirect-uri, or --device');
            process.exitCode = 1;
            return;
        }

        const grantTypes = ['refresh_token'];

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

        await AppDataSource.getRepository(OAuthClient).save(client);

        console.log('Application created.');
        console.log(`client_id:     ${client.clientId}`);
        console.log(`client_secret: ${client.clientSecret ?? '(none, public client, must use PKCE)'}`);
        console.log(`grant types:   ${grantTypes.join(', ')}`);
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
