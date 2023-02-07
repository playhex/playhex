# Hex

Play Hex online.

![Game screenshot](screenshots/game.png)


## Install

```
yarn install
yarn dev
```

### Mohex AI

- Install dependencies

``` bash
sudo apt update
sudo apt install libboost-all-dev build-essential libdb-dev build-essential cmake
```

- install and build Mohex from <https://github.com/cgao3/benzene-vanilla-cmake>
- provide the path to Mohex binary
- define the binary full path in config in your `.env`:

``` dotenv
MOHEX_BINARY=/home/debian/develop/benzene-vanilla-cmake/build/src/mohex
```
