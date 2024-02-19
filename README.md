# Hex

Play Hex online.

Currently hosted here: <https://hex.alcalyn.app/>

![Game screenshot](assets/images/screenshots/game.png)


## Install

Requires:

- node >= 18.18.2
- yarn

Create and `.env` file with at least your database access. Example:

``` .env
DATABASE_URL="mysql://root:root@localhost:3306/hex"
```

Then run these commands:

``` bash
# Install dependencies
yarn install

# Generate prisma classes
yarn prisma generate

# Create database schema
yarn prisma db push

# Start application
yarn serve
```

Wait javascript to be bundled, then the application is available at:

<http://localhost:3000/>

## Test

``` bash
# Unit tests (Mocha)
yarn test

# e2e tests (Cypress)
yarn test:e2e

# Open Cypress browser
yarn cypress open
```

And see [manual tests](./manual-tests.md) to check also.

### Optimize js size

``` bash
# See which dependencies take more size
yarn analyse-size
```

Compare two json files with: <https://happy-water-0887b0b1e.azurestaticapps.net>.

## License

This library is under [AGPL-3.0 license](LICENSE).
