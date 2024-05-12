# Hex

Play Hex online.

Currently hosted here: <https://playhex.org/>

![Game screenshot](assets/images/screenshots/game.png)


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

<https://github.com/alcalyn/hex-ai-distributed>

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

## Test

``` bash
# Unit tests (Mocha)
yarn test

# e2e tests (Cypress)
yarn test:e2e

# Open Cypress browser
yarn cypress open
```

**Warning**: For e2e/cypress tests, random bots are required so don't forget to run this before:

``` bash
yarn hex create-random-bots
```

### Optimize js size

``` bash
# See which dependencies take more size
yarn analyse-size
```

Compare two json files with: <https://happy-water-0887b0b1e.azurestaticapps.net>.

## License

This library is under [AGPL-3.0 license](LICENSE).
