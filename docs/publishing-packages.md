# Publishing packages on npm

Some parts of PlayHex are published as standalone npm packages, under the `@playhex` scope.

They live in `src/packages/<name>`, and are pnpm workspaces (see `pnpm-workspace.yaml`: every folder in `src/packages/` is a workspace).

| Package | Folder | Description |
|---|---|---|
| `@playhex/move-notation` | `src/packages/move-notation` | Parse, validate, convert move notation (`"c2"`, `"swap-pieces"`...) |
| `@playhex/pixi-board` | `src/packages/pixi-board` | Hex board renderer built on PixiJS |

## Prerequisites (once)

- Have access to the `playhex` npm organization: create it on <https://www.npmjs.com/org/create> (free for public packages), or ask to be added to it.
- Log in and enable 2FA:

``` bash
npm login
npm whoami
```

## How a package works

- In the repo, `exports` points to the **TypeScript sources** (`"exports": { ".": "./index.ts" }`):
  nothing to build during development, Vite, ts-node and tsc read sources directly.
- On publish, pnpm replaces `main`, `types` and `exports` with the ones in `publishConfig`,
  which point to the **built files** in `dist/`.
- `prepack` script builds `dist/` automatically before packing/publishing.
- Dependencies between packages use `workspace:^`, which pnpm replaces with the real version on publish
  (`"@playhex/move-notation": "workspace:^"` becomes `"^1.0.0"`).

The app itself imports packages:

- with relative paths (`../../packages/move-notation/move-notation.js`) in server and shared code,
  because compiled server code (`dist/server`, `dist/shared`, `dist/packages`) is run directly by Node,
- or by package name in client code (`@playhex/pixi-board`), resolved by a Vite alias (see `vite.config.ts`).

## Rules for a publishable package

- It must **not import anything outside its folder** with a relative path.
  If it needs some code from elsewhere, either move this code into the package (if only this package needs it),
  or make it a package too and depend on it with `workspace:^`.
- Declare all its dependencies in its own `package.json`
  (pnpm does not let a package use a dependency it does not declare).
  Libraries that the app also uses (e.g `pixi.js`) should be `peerDependencies` + `devDependencies`,
  so the app and the package share the same instance.
- Code imported at runtime by the server must not import another package by its name
  (Node cannot run `.ts` files the dev `exports` points to).
  Use `import type { ... } from '@playhex/...'` when only types are needed: it is removed from compiled js.
- Only `dist/` is published (`"files": ["dist"]`), plus `package.json`, `README.md` and `LICENSE` which are always included.
- Each package has a copy of the root `LICENSE` file, a `"license": "AGPL-3.0-only"` field in `package.json`, and a "License" section in its `README.md`.

## Add a new package

Example with `src/shared/game-engine` becoming `@playhex/game-engine`:

1. Move the folder, then fix relative imports in the whole app (files that import it, and files it imports):

    ``` bash
    git mv src/shared/game-engine src/packages/game-engine
    ```

2. Make sure it does not import anything outside its folder (see rules above).
   `game-engine` imports `move-notation`: replace `../move-notation/move-notation.js` imports by `@playhex/move-notation`.

3. Create `src/packages/game-engine/package.json`, based on `src/packages/move-notation/package.json`:
    - `name`, `version` (`1.0.0`), `description`, `repository.directory`
    - `exports` to `./index.ts`, `publishConfig` to `./dist/...`
    - `dependencies` (e.g `"@playhex/move-notation": "workspace:^"`, `"seedrandom": "^3.0.5"`), `peerDependencies`, `devDependencies`

4. Add a build config:
    - pure TypeScript package: copy `src/packages/move-notation/tsconfig.lib.json` (tsc builds js + types in `dist/`),
      and set `include`/`exclude` to not build tests.
    - package that needs bundling or has assets: copy `vite.lib.config.ts` + `tsconfig.lib.json` from `src/packages/pixi-board`.

5. Add a `.gitignore` (`node_modules/` and `dist/`), a `README.md` with install, usage example and license section, and copy the license: `cp LICENSE src/packages/game-engine/`.

6. Install, build and check:

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
