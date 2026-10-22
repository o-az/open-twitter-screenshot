# nicexpost

A browser-based X post-to-image studio. Paste a public post URL, choose a look, adjust its presentation, and download or copy a finished image. No account, API key, watermark, analytics, or content editing.

## Run

Use Node.js 22+ and pnpm 12 (the package manager version is pinned in `package.json`).

```sh
pnpm install
pnpm dev
```

The development server listens on port 3000. For a production build:

```sh
pnpm build
pnpm start
```

The build needs network access to download the Google fonts used by `next/font`. Runtime post fetching needs outbound HTTPS to X's syndication and media origins, plus `api.fxtwitter.com` for full long-post text. No API keys are required. Optionally set `NEXT_PUBLIC_SITE_URL` to your deployment's public origin before building so social-image metadata uses that domain; it defaults to the local development origin. When running in an Amp orb, use its service/portal tools to expose port 3000 rather than sharing a localhost address.

## Use the studio

- Paste an `x.com`, `twitter.com`, mobile Twitter, FXTwitter, VXTwitter, or FixupX status URL—or a numeric post ID. Photo suffixes and query strings work.
- Start with Daydream, Clean, Midnight, Sunset, Paper, Glass, or Brutalist. Save up to 12 personal looks in this browser.
- Customize content visibility, type, colors, border, shadow, glass, 20 curated gradients, four meshes, uploaded backgrounds, grain, padding, and six frame sizes. Controls move to a bottom drawer on mobile; the preview remains visible above it.
- Very tall auto-height posts open from the top at fit-to-width rather than shrinking to an unreadable strip. Scroll within the preview, or focus it and use the arrow/Page Down/End keys. Choose **Fit all** for the complete overview. Short posts and fixed frames still fit by default; a new post resets preview zoom and scroll. Exports always contain the entire image.
- Download PNG, JPEG, WebP, or SVG at 1×–4×, or copy PNG to the clipboard. JPEG/WebP have quality controls. PNG/WebP preserve transparent backgrounds; JPEG uses white.
- Share look copies the current address, including the post and complete style. Reset restores presentation defaults without changing the post.
- Keyboard: ⌘/Ctrl+V pastes a post link outside inputs; ⌘/Ctrl+S downloads; ⌘/Ctrl+C copies the image outside inputs and text selections; `?` opens shortcuts; Esc closes overlays.

The app respects the system's light/dark preference on first visit, defaults to dark without a preference, and remembers a manual choice. User-selected post colors are independent of the app theme.

## Fetching and data integrity

`GET /api/tweet?id=<id>` fetches X's public syndication endpoint **server-side**, using the same numeric token calculation as react-tweet and the current syndication feature flags. A Zod-validated normalizer produces our `Post` model. Successful fetches revalidate after approximately one hour.

When syndication marks a long post as truncated, the server requests its complete body from FxTwitter's public `/2/status/<id>` API. This third-party fallback receives only the public post ID. It must match the post ID, author ID/handle, canonical status ID, and opening text. Only text and its validated entities are replaced; author, media, and metrics remain from X. Lookups have a six-second timeout and 1 MiB response limit. Quotes and reply context use the same fallback. If it fails or disagrees, the original truncated preview and warning remain.

`GET /api/img?url=<url>` streams avatars, posters, and media through this origin. Only exact HTTPS `pbs.twimg.com` and `video.twimg.com` hosts are accepted. Credentials, ports, redirects, lookalike hosts, non-raster MIME types, and mismatched signatures are rejected. A 12 MiB body limit and 12-second deadline bound the proxy. Successful images receive long cache headers; upstream cookies are never forwarded.

The pure `PostCard` renderer owns the post's markup and contains no HeroUI. Export captures only the artboard, not the surrounding workspace. Fonts and media are embedded; missing assets stop export instead of silently disappearing. The exporter checks all embedded font subsets and waits for active card transitions. The preview's zoom never changes output dimensions.

### Limitations

- This is an unofficial public endpoint. X can change its format, rate-limit requests, or remove access. Private/authenticated posts cannot be fetched.
- X often does **not** distinguish private, deleted, age-gated, and other unavailable posts. Specific messages require an explicit upstream reason; an empty response or 404 gets an honest ambiguous message. Explicit-reason tests are synthetic, not claimed live examples.
- Full long-post text depends on the unofficial FxTwitter service and conservative validation. When unavailable, the app marks the remaining truncation and links to the original. It never invents missing text or numbers. Missing metrics and unavailable content have disabled controls with explanations. Rich-text emphasis and inline attachment placement are not reproduced; attachments follow the complete body.
- Videos and GIFs render as still posters. Quotes/parent context are limited to one level. Unknown link-card or Community Note formats are omitted rather than guessed.
- SVG contains an embedded high-resolution raster image: it is portable, but **not editable vector text**. JPEG/WebP are lossy; tiny anti-aliasing differences from the native preview are normal even with lossless PNG.
- Clipboard writing requires a secure context and browser permission; unsupported browsers can download instead. Chromium is verified; Safari and Firefox are not verified.
- Background uploads are optimized locally to WebP (up to 1200 px and 160,000 data-URL characters). They are included in the URL fragment, never uploaded. Complex images can exceed that limit, and very long share links may be truncated by messaging apps. Treat share links as public to anyone receiving them.
- Export is limited to 64 megapixels to avoid browser canvas/memory limits. Use a fixed frame or lower scale for unusually tall posts.
- Style and saved looks stay in localStorage, not an account. A shared relative timestamp is anchored to its creation time so it reproduces consistently; metrics can change on a future refetch.

## Checks and evidence

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Vitest covers accepted/rejected URLs, runtime normalization, 22 saved real syndication responses and a complete FxTwitter response, optional metrics, number/date formatting, style URL round-trips, fetch errors, and proxy security. The long-post regression covers identity validation, Unicode entities, stale media indices, and fallback failures. All responses are consolidated in `test/fixtures/tweets.json`; provenance and reproduction commands are in `test/fixtures/README.md`. The app's landing example remains separate in `src/lib/tweet/example.json`.

Run the app, then run the browser suite:

```sh
# Install a browser once if your machine does not already provide Chromium.
pnpm exec playwright install chromium
pnpm test:e2e

# Or use an existing Chromium executable and a different running server:
CHROMIUM_PATH=/path/to/chrome BASE_URL=http://localhost:3000 pnpm test:e2e
```

The browser suite uses the real UI, route handlers, syndication service, and image proxy for 13 post categories, plus the reported 5,500-character long-post regression through the live FxTwitter fallback. It checks controls, saved looks, sharing in a fresh browser, keyboard shortcuts, clipboard MIME type, 360–2560 px widths, and touch-emulated 390 px Chromium. Explicit deleted/protected/age-restricted/rate-limit responses are separately labeled simulations. The export test compares all four formats with an independent native-browser 2× capture, so wrong font metrics cannot pass just because dimensions match.

Both test runner configurations live under `test/`; the package scripts select them automatically. Playwright results go to `test/test-results/`, and coverage reports, when enabled, go to `test/coverage/`.

Screenshots and example exports are generated under `test/screenshots/` (ignored by Git), including:

- `01-landing.png`, `one-image.png`, `four-images.png`, `video.png`, `quote-gif.png`, `reply.png`, `emoji.png`, `long-complete.png`, `reported-long-complete.png`, `link-card.png`, `rtl.png`, `community-note.png`
- `light-paper.png`, `glass.png`, `mobile.png`, `mobile-drawer.png`, `invalid-url.png`, `loading.png`
- `export.png`, `export.jpeg`, `export.webp`, `export.svg`, `photo-paper.png`, `reported-long-export.png`

## Structure and renaming

```text
src/app/                 App Router pages, metadata, tweet and image routes
src/config/site.ts       Product name, description, stable storage namespace
src/components/studio/   HeroUI controls and responsive workspace
src/components/post/     Dependency-light post renderer and artboard geometry
src/lib/tweet/           Parsing, fetching, normalization, landing example
src/lib/style/           Zod state, looks, gradients, URL codec
src/lib/export/          Image capture and background optimization
test/unit/               Vitest contracts
test/e2e/                Playwright browser contracts
test/fixtures/           Consolidated saved responses and provenance
test/scripts/            Fixture collection tooling
test/*.config.ts         Test runner configurations
```

To rename the product, change `name` and `description` in `src/config/site.ts`. The wordmark, page title, metadata, and generated Open Graph image use those values. Keep `storageKey` unchanged if you want saved designs to survive a rename. The package name is build metadata, not displayed product copy. See `DECISIONS.md` for design and engineering tradeoffs.
