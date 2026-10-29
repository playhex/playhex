# Publishing packages on npm

Some parts of PlayHex are published as standalone npm packages, under the `@playhex` scope.

They live in `src/packages/<name>`, and are pnpm workspaces (see `pnpm-workspace.yaml`: every folder in `src/packages/` is a workspace).

| Package | Folder | Description |
|---|---|---|
| `@playhex/move-notation` | `src/packages/move-notation` | Parse, validate, convert move notation (`"c2"`, `"swap-pieces"`...) |
| `@playhex/conditional-moves` | `src/packages/conditional-moves` | Conditional moves tree and editor |
| `@playhex/shading-patterns` | `src/packages/shading-patterns` | Board shading patterns |
| `@playhex/pixi-board` | `src/packages/pixi-board` | Hex board renderer built on PixiJS |

`@playhex/tournament-organizer`, our fork of [tournament-organizer](https://github.com/slashinfty/tournament-organizer),
is also published under the `@playhex` scope, but lives in its own repository: <https://github.com/playhex/tournament-organizer>
(see "Publishing" in its README).

## Prerequisites (once)

- Be a member of the [`playhex` npm organization](https://www.npmjs.com/org/playhex), with publish rights
  (the owner adds members in organization settings > Members).
- Enable 2FA on your npm account (Account settings > Two-Factor Authentication).
- Log in on your machine (the token is stored in `~/.npmrc`):

``` bash
npm login
npm whoami # should print your npm username
```

Packages are published with public access (`publishConfig.access: "public"`),
so publishing to the free organization works, also for the first version.

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
- Everything the app needs must be exported from its `index.ts` (no deep imports like `@playhex/pixi-board/facades/...`),
  or from an entry point declared in `exports`.
  Code that needs an optional dependency goes in its own entry point,
  with the dependency in `peerDependencies` + `peerDependenciesMeta: { optional: true }`
  (see `@playhex/pixi-board/conditional-moves` and `@playhex/pixi-board/shading-patterns`).
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

All packages are published together from the repo root with `pnpm -r publish`:
it publishes every package whose current version is not on npm yet, dependencies first
(`move-notation`, then `shading-patterns` and `conditional-moves`, then `pixi-board`),
and skips the others. Root `package.json` is `private`, so it is never published.

Each package has its own version: only bump the packages that changed.

### First publication

All packages are at `1.0.0` and not on npm yet, so skip the version bump:

``` bash
npm whoami
git status # must be clean, on master, pushed
pnpm -r publish --dry-run
pnpm -r publish
```

Then tag (see step 6 below) with the 4 packages at `1.0.0`.

On first publication of a package, npm first creates a `0.0.0-stage` placeholder version,
and the real version appears a few minutes later (`npm view @playhex/<name> dist-tags` shows `latest: 1.0.0`).
The placeholder stays in the version list, it is harmless.

### Release new versions

1. Bump version of the packages that changed:

``` bash
cd src/packages/<name>
pnpm version patch --no-git-tag-version # or minor, major
```

If you bump a package that other packages depend on (e.g `move-notation`):

- patch or minor: nothing else to do. Published dependents require `^1.0.0`, which accepts the new version,
  and `workspace:^` is replaced with the new version on next publish of dependents.
- major: also bump and publish the packages depending on it (`conditional-moves`, `pixi-board`),
  else their published version still requires the previous major.

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

4. Commit and push the version bump
   (pnpm refuses to publish if git working tree is not clean, not on `master`, or not up to date with remote):

``` bash
git commit -am "release @playhex/<name>@<version>"
git push
```

5. Publish, from the repo root:

``` bash
pnpm -r publish --dry-run # lists the packages that will be published
pnpm -r publish
```

With 2FA, npm asks for a one-time password, or opens a browser to confirm.
To pass it directly: `pnpm -r publish --otp <code>`.
If it fails in the middle (e.g expired code), just run it again: already published packages are skipped.

Check on npm:

``` bash
npm view @playhex/<name> version
```

A published version cannot be republished, even after unpublishing it.
If something is wrong, fix it and publish a new patch version.

6. Tag each published package and push tags:

``` bash
git tag @playhex/<name>@<version>
git push --tags
```

For example, after first publication:

``` bash
for p in move-notation shading-patterns conditional-moves pixi-board; do git tag "@playhex/$p@1.0.0"; done
git push --tags
```
