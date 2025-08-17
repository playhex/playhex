# Hex

Play Hex online.

Currently hosted here: <https://playhex.org>

[![PlayHex](assets/images/screenshots/game.png)](https://playhex.org)

## Install

Requires:

- node >= 18.18.2
- yarn
- mysql or postgres

Create an `.env` file with at least a database access. Example:

``` .env
DATABASE_URL="mysql://root:root@localhost:3306/hex"
```

Then run these commands:

``` bash
# Install dependencies
yarn install

# Create database schema
yarn db:sync

# Start application
yarn serve
```

Wait javascript to be bundled, then the application is available at:

<http://localhost:3000/>

### Play with AI

For development you can use random and determinist random bots.

Enable them with:

``` bash
yarn hex create-random-bots
```

Determinist random bot will always plays same games
if you play same moves in same order.
This is useful to reproduce things.

If you need to work with real AI (Katahex, Mohex), see:

<https://github.com/playhex/hex-ai-distributed>

You can install it locally, and with Docker you don't need to compile any ai engine.

Once installed, add to your `.env` file:

```
HEX_AI_API=http://localhost:8088
```

And enable ai players in database with:

``` bash
yarn hex create-katahex-bots
yarn hex create-mohex-bots
```

## Translate PlayHex

PlayHex uses [i18next](https://www.i18next.com/)
and [i18next-vue](https://github.com/i18next/i18next-vue)
to translate user interface.

Here are all available translations, just click the following image to help translating or add a new language:

[![Translation status](https://hosted.weblate.org/widget/playhex/multi-auto.svg)](https://hosted.weblate.org/engage/playhex/)

You can contribute to translations without any coding,
thanks to [Weblate](https://weblate.org).

## Icons

- https://icones.js.org/
- Then copy "Components > Unplugin Icons"
- Add it to `src/client/vue/icons/index.ts`
- Then use it in templates

## Admin endpoints

Some API endpoints exists for admin tasks (i.e persist all memory games into database manually).

To use them, you must add in your `.env`:

``` .env
ADMIN_PASSWORD=your-password
```

Then you can now call admin endpoints by setting this same password as bearer token, curl example:

``` bash
curl --location --request POST 'http://localhost:3000/api/admin/persist-games' \
    --header 'Authorization: Bearer your-password'
```

See available admin endpoints in postman collection, in "Admin" folder.

## Push notifications

To test push notifications:

- Generate and configure VAPID keys

Run:

```
yarn web-push generate-vapid-keys
```

Then put public keys, private keys in your .env, with any email:

```
PUSH_VAPID_PUBLIC_KEY=BAFGnysW3...qfMIgTE
PUSH_VAPID_PRIVATE_KEY=E-YiR...2I
PUSH_VAPID_EMAIL=test@example.org
```

- You must be in secure context (https enabled). You can use ngrok.
- Make sure your client have subscribed push notifications: request permission again in player settings.

## Test

``` bash
# Unit tests (Mocha)
yarn test

# e2e tests (Cypress)
yarn test:e2e

# Open Cypress browser
yarn cypress open
```

**Warning**: For e2e/cypress tests, there is some configuration requirements:

- Test bots must exists in database, if not, run:

``` bash
yarn hex create-test-bots
```

- Ranked bot games must be allowed.

This is the default, but if you have changed it, make sure you have in `.env`:

```
ALLOW_RANKED_BOT_GAMES=true
```

- A functional test in auth.cy.ts needs at least one game in database to run fully.

### Debug server with breakpoints

In package.json, script `serve`, replace "dev-server" by "dev-server-debug".

Then open Chromium go to: `chrome://inspect` and click "inspect" in "Remote Target" section.

Then go to "Sources" tab, browse source files add breakpoints, and do what is needed in the application.

### Optimize js size

``` bash
# See which dependencies take more size
yarn analyse-size
```

Compare two json files with: <https://happy-water-0887b0b1e.azurestaticapps.net>.

### Using CDN

To prevent bundling some large dependencies, we can turn on using CDN.

To do so, in `.env`:

``` properties
USE_CDN=true
```

(defaults to `false`).

Currently, only these dependencies have a CDN import:
- bootstrap, only css

So when upgrading dependencies, bundled and CDN versions should match, so we must upgrade both:
- with yarn
- version in `views/partials/cdn.ejs`

## License

This project is under [AGPL-3.0 license](LICENSE).

### Exceptions

Files under these folders are under another license:

| Folder | License | Author |
| ------ | ------- | ------ |
| `assets/sounds/lisp/` | `CC BY-NC-SA 4.0` | [EdinburghCollective](http://lichess.org/@/EdinburghCollective) |
