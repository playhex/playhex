# Hex

Play Hex online.

Currently hosted here: <https://hex.alcalyn.app/>

![Game screenshot](assets/images/screenshots/game.png)

## Features

This is a work in progress. Here is the unexhaustive list of implemented and planned features:

- [x] Play online multiplayer
- [x] Play vs an AI (Mohex)
- [x] Dark/light theme, mobile support
- [x] Multiple board sizes, from 1x1 to 25x25
- [x] Watch other games currently playing
- [ ] Swap rule
- [ ] Let AI review my game, bad moves, better moves...
- [ ] Chrono
- [ ] Translations to other languages
- [ ] Elo score, games history


## Install

```
yarn install
yarn serve
```

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

### Mohex API

To play against Mohex AI, see: <https://github.com/alcalyn/mohex-api>.
This repository exposes Mohex AI through an http api.

You can run the Docker image:

``` bash
docker run -p 3001:3000 alcalyn/mohex-api
```

Check if it responds with <http://localhost:3001/api/license>.

Then enable Mohex locally by adding in your `.env`:

``` dotenv
HEX_AI_API_ENDPOINT=http://localhost:3001/api/calculate-move
```

### Optimize js size

``` bash
# See which dependencies take more size
yarn analyse-size
```

Compare two json files with: <https://happy-water-0887b0b1e.azurestaticapps.net>.

## License

This library is under [AGPL-3.0 license](LICENSE).
