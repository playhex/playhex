# Social preview

Open Graph, Twitter card and JSON-LD meta tags for shared links (Discord, Facebook, X...) and search engines,
with a generated preview image (board position, or a card with title and infos).

Code: `src/server/social-preview/`.

## Test it

Add `?social_preview` to force the crawler version, then look at the `<head>`:

```bash
curl -s 'http://localhost:13000/games/<publicId>?social_preview' | grep -E 'og:|twitter:|ld\+json'
```

Note: `curl` without User-Agent is already detected as a bot. To get the visitor version, pass a browser User-Agent.

After deploy, check with [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/), a Discord link preview, and Google [Rich Results Test](https://search.google.com/test/rich-results).

Server needs Noto fonts for image rendering: `fonts-noto-core fonts-noto-cjk`.

## How it works

- `socialPreviewRouter` runs before `pagesRouter`, and only for crawlers (`isbot` on User-Agent): real visitors get the default meta, without any database query.
- For each page type, a loader fetches the entity, and a `meta/*MetaBuilder.ts` class produces title, description, image and JSON-LD, rendered in `views/partials/seo-tags.ejs`. Image version comes from the same class, so the image url in meta always matches the image served by `ogImageRouter`.
- Language: `?lang=`, then Facebook `fb_locale`, then `Accept-Language`, else English. Texts are in `social_preview.*` translation keys.
- Images are served by `ogImageRouter` at `/og/<type>/<id>.png` (1200×630, SVG rasterized by sharp, board drawn like pixi-board in `src/shared/app/boardSvg.ts`), cached on disk in `OG_CACHE_PATH`, with a server-computed version `?v=`.
- Missing, hidden or canceled content falls back to default meta with `noindex`; draft puzzles get full meta but `noindex`; open games show their host, without board.

## Supported pages

| Page | Image | JSON-LD |
|---|---|---|
| `/games/:publicId` | current or final position (winning path), card for open games | SportsEvent |
| `/tournaments/:slug` | card | Event |
| `/tournament-series/:slug` | card | EventSeries |
| `/puzzles/:publicId` | puzzle position, isolation greyed out or hidden | CreativeWork |
| `/puzzles/collections/:publicId` | card | CollectionPage |
| `/@:slug` (player) | card with avatar | ProfilePage |
| `/king-of-the-hill/:slug` | card | breadcrumb only |
| Static pages: `/puzzles`, `/tournaments`, `/tournament-series`, `/king-of-the-hill`, `/games-archive`, `/videos`, `/statistics`, `/guide` | card with page title and description, no data that would get outdated | none |
| `/hexplorer`, `/swap-maps` | board screenshot (dark theme, landscape, no texts) in `assets/images/social-preview/<key>.jpg` | none |

All pages also get WebSite + Organization JSON-LD, and a breadcrumb when relevant.
