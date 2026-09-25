# Publishing packages on npm

Some parts of PlayHex are published as standalone npm packages, under the `@playhex` scope.

They live in `src/packages/<name>`, and are pnpm workspaces (see `pnpm-workspace.yaml`: every folder in `src/packages/` is a workspace).

| Package | Folder | Description |
|---|---|---|
| `@playhex/move-notation` | `src/packages/move-notation` | Parse, validate, convert move notation (`"c2"`, `"swap-pieces"`...) |
| `@playhex/conditional-moves` | `src/packages/conditional-moves` | Conditional moves tree and editor |
| `@playhex/shading-patterns` | `src/packages/shading-patterns` | Board shading patterns |
| `@playhex/pixi-board` | `src/packages/pixi-board` | Hex board renderer built on PixiJS |

## Prerequisites (once)

- Have access to the `playhex` npm organization: create it on <https://www.npmjs.com/org/create> (free for public packages), or ask to be added to it.
- Log in and enable 2FA:

``` bash
npm login
npm whoami
```

## How a package works

Each package is a TypeScript composite project (`tsconfig.json`), built to its own `dist/` folder.

`exports` in `package.json` uses conditions, so that each tool gets what it can read:

``` json
"exports": {
  ".": {
    "source": "./index.ts",
    "types": "./index.ts",
    "node": "./dist/index.js",
    "default": "./index.ts"
  }
}
```

| Who | Condition used | Gets |
|---|---|---|
| tsc, vue-tsc, IDE | `types` | TypeScript sources |
| Vite (client, dev and build) | `default` | TypeScript sources |
| ts-node (`pnpm hex`, `pnpm test`, `pnpm typeorm`), via `register.js` which adds the `source` condition | `source` | TypeScript sources |
| Node running compiled server (`node index.js`) | `node` | compiled `dist/index.js` |

So `dist/` must be built before running compiled server: `pnpm build` and `pnpm dev-server` do it,
because `src/server` and `src/shared` tsconfigs reference packages projects, and `tsc -b` builds references.

On publish:

- `prepack` script rebuilds `dist/` from scratch,
- pnpm replaces `main`, `types` and `exports` with the ones in `publishConfig`, which point to `dist/` only,
- dependencies between packages use `workspace:^`, which pnpm replaces with the real version
  (`"@playhex/move-notation": "workspace:^"` becomes `"^1.0.0"`).

The app (client, server, shared) always imports packages **by name**: `import { parseMove } from '@playhex/move-notation'`.
Each package must be listed in root `package.json` dependencies (`"workspace:*"`),
and in `references` of the tsconfig of each app part that imports it (`src/client`, `src/server`, `src/shared`).

## Rules for a publishable package

- It must **not import anything outside its folder** with a relative path.
  If it needs some code from elsewhere, either move this code into the package (if only this package needs it),
  or make it a package too and depend on it with `workspace:^`.
- Declare all its dependencies in its own `package.json`
  (pnpm does not let a package use a dependency it does not declare).
  Libraries that the app also uses (e.g `pixi.js`, `tiny-typed-emitter`) should be `peerDependencies` + `devDependencies`,
  so the app and the package share the same instance.
- Everything the app needs must be exported from its `index.ts` (no deep imports like `@playhex/pixi-board/facades/...`).
- The server must only import packages that can run in Node:
  do not import `@playhex/pixi-board` from server or shared code, it would load `pixi.js`.
  Pure logic used by both server and board must be in its own package (like `conditional-moves` and `shading-patterns`).
- Tests are in `test/`, with their own `test/tsconfig.json` (which enables node types, and is not built into `dist/`).
  Import `describe` and `it` from `mocha`.
- Published files: `dist/` without source maps and build info, plus `package.json`, `README.md` and `LICENSE`.
- Each package has a copy of the root `LICENSE` file, a `"license": "AGPL-3.0-only"` field in `package.json`, and a "License" section in its `README.md`.

## Add a new package

Example with `src/shared/game-engine` becoming `@playhex/game-engine`:

1. Move the folder:

``` bash
git mv src/shared/game-engine src/packages/game-engine
```

2. Make sure it does not import anything outside its folder (see rules above).
   `game-engine` imports `move-notation`: replace `../move-notation/move-notation.js` imports by `@playhex/move-notation`.

3. Copy config files from a pure TypeScript package, e.g `src/packages/conditional-moves`:
    - `package.json`: change `name`, `description`, `repository.directory`, keep `version` to `1.0.0`,
      set `dependencies` (e.g `"@playhex/move-notation": "workspace:^"`, `"seedrandom": "^3.0.5"`), `peerDependencies`, `devDependencies`
    - `tsconfig.json`: set `references` to the packages it depends on
    - `test/tsconfig.json` if it has tests
    - `.gitignore`, `LICENSE`, and write a `README.md` with install, usage example and license section.

   For a package that needs bundling or has assets, see `vite.lib.config.ts` and `tsconfig.lib.json` in `src/packages/pixi-board`.

4. Make the app use it:
    - add `"@playhex/game-engine": "workspace:*"` to root `package.json` dependencies,
    - add `{ "path": "../packages/game-engine" }` to `references` of `src/shared/tsconfig.json`, `src/server/tsconfig.json`, `src/client/tsconfig.json`,
    - replace relative imports to the package by `@playhex/game-engine` in the whole app.

5. Install, build and check:

``` bash
pnpm install
pnpm --filter @playhex/game-engine run build
pnpm lint && pnpm test
```

## Publish

1. Bump version of the packages that changed:

``` bash
cd src/packages/<name>
pnpm version patch --no-git-tag-version # or minor, major
```

If you bump a package that other packages depend on (e.g `move-notation`), nothing else to do:
`workspace:^` is replaced with the new version on publish.

2. Check what will be published:

``` bash
pnpm pack --pack-destination /tmp
tar tzf /tmp/playhex-<name>-<version>.tgz # should contain only dist/, package.json, README.md, LICENSE
tar xzOf /tmp/playhex-<name>-<version>.tgz package/package.json # check main, types, exports, dependencies
```

3. Optionally, test it in an empty project:

``` bash
mkdir /tmp/test-package && cd /tmp/test-package && npm init -y
npm install /tmp/playhex-<name>-<version>.tgz # plus its peer dependencies, and tarballs of its unpublished @playhex dependencies
# then write a small index.ts importing the package, and check it with: npx tsc --noEmit index.ts
```

4. Commit the version bump (publishing requires a clean git working tree, on `master` branch):

``` bash
git commit -am "release @playhex/<name>@<version>"
```

5. Publish, from the repo root:

``` bash
pnpm -r publish --dry-run
pnpm -r publish
```

`pnpm -r publish` publishes all packages whose version is not yet on npm, dependencies first.

6. Tag and push:

``` bash
git tag @playhex/<name>@<version>
git push --follow-tags
```
