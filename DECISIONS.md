# Product and engineering decisions

## Direction

- A quiet, charcoal design workspace with a warm orange accent, an always-visible example, and a right-hand inspector. On small screens the inspector becomes a bottom drawer. No accounts, telemetry, or content editing.
- The initial repository was empty. Components follow HeroUI v3's official compound-component and React Aria conventions, with Tailwind v4 semantic tokens.
- Next.js latest stable at implementation time, React 19, strict TypeScript, pnpm, HeroUI v3, Zod, Lucide, and Vitest. Playwright exercises the complete browser workflow.

## Data integrity

- Fetch X syndication only on the server. Never fabricate a metric or infer missing post text. Missing fields disable their controls.
- X does not reliably distinguish deleted, private, age-gated, and otherwise unavailable posts. Explicit upstream reasons get specific messages; ambiguous responses must say “unavailable,” not assert a cause.
- Syndication can truncate long posts and omit link cards, Community Notes, reposts, bookmarks, and views. A reported long post exposed the practical cost: only 276 characters were available from syndication. Use FxTwitter's public v2 API as a server-side, text-only fallback for positively identified truncation; no authenticated scraping or new API keys in this app.
- Accept full text only when the provider, post ID, author ID/handle, canonical status ID, and opening text agree. Preserve syndication metadata and metrics. Bound the fallback to six seconds and 1 MiB, cache for one hour, and retain the original warning on failure. This adds a third-party availability dependency only for long posts, including quoted and parent context.
- Note entities use code-point offsets, but FxTwitter can also include stale media indices from the short version. Validate every entity against its original token before applying it. Reuse the syndication text normalizer for link display and Unicode handling; never let a media facet remove unrelated prose. Rich-text emphasis and inline media placement remain outside the renderer's current model.

## Verification plan

- The starting state is an empty directory; there is no earlier application to compare.
- Verify real public posts through the UI: text, one and four images, video, quote, reply, emoji, long text, and link-bearing posts. Preserve real JSON responses as provenance-labeled fixtures. Never describe synthetic edge-case tests as live upstream proof.
- Verify export files and their dimensions for PNG, JPEG, WebP, and SVG; inspect embedded fonts/images, test clipboard, transparent alpha, share round-trips, invalid/unavailable errors, mobile layout, and browser console.
- Check every setting through its public UI, including disabled unavailable fields. Run lint, typecheck, unit tests, and production build without suppressing failures.

## Implementation choices

- Pin Next 16.4.2, React 19.3.1, HeroUI 3.2.6, and pnpm 12. TypeScript 5.9 and ESLint 9 deliberately stay within Next's ESLint peer ranges rather than choosing incompatible newest majors. No additional UI kit.
- Keep unit/browser tests, runner configurations, fixture tooling, and generated test outputs under `test/`. Consolidate all 23 captured responses into `test/fixtures/tweets.json`, keyed by provider and post ID to preserve both versions of the long post. Keep the landing example separately in `src/lib/tweet/example.json` so production never depends on test data and refreshing fixtures does not change the example.
- `modern-screenshot` handles computed CSS, embedded web fonts, and same-origin assets in the browser. It avoids a server-side browser for each download. Its SVG output is a raster-wrapped SVG, explicitly described in the UI rather than presented as vector text. Correct the SVG outer dimensions to honor the chosen scale.
- Preserve all font formats/subsets. Inspection found that `preferredFormat: "woff2"` in modern-screenshot 4.7 removed alternating `src` declarations, sometimes including Latin, which caused fallback-font wrapping. Omitting that filter embeds all seven subset faces consistently; export fails if any discovered face lacks embedded data.
- Wait for fonts, images, and card transitions before capture. Disable editing during capture so an in-flight export cannot mix two designs. Limit output to 64 MP rather than silently downscale it.
- Glass uses an aligned, blurred copy of the canvas behind a translucent card. This gives the intended frosted appearance without `backdrop-filter`, which the SVG capture path cannot reliably reproduce. Gradient borders use a separate masked ring so they do not turn glass opaque.
- One photo retains its full original aspect ratio and occupies the full content width. A height cap caused a visible empty strip in portrait exports; remove the cap and let zoom-to-fit or fixed-frame scaling handle tall cards. Multi-photo grids use X-style cropping.
- Auto-height canvases taller than twice their width now open at fit-to-width, capped at 100%, starting at the top. Shorter posts and fixed frames retain fit-all defaults. The labeled “Fit all” button explicitly switches to the complete overview. Preview zoom and scroll reset for a new post, remain local to the workspace, and never change export size or content.
- Center small previews with automatic margins rather than flex centering: oversized previews must start at a reachable top/left edge. The scroll region supports keyboard scrolling; its scaled wrapper clips unscaled layout overflow so Fit all does not leave phantom scroll space.
- The complete Zod style object is authoritative. The URL fragment contains only differences from defaults, encoded as base64url JSON. Post ID and an anchored relative-time reference use query parameters. localStorage is optional; invalid URL state resets safely. A hash avoids sending uploaded backgrounds to the server.
- Uploads remain local, are restricted to raster types, and are resized/compressed to a bounded data URL. Self-contained share links are preferable here to adding storage/accounts; the cost is long links for detailed backgrounds. Saved looks are bounded to 12 per browser.
- App appearance respects system preference and remembers explicit choices. The orange accent becomes darker in light mode to maintain contrast. Measured contrast: light primary 5.07:1, dark primary 7.15:1, light muted 5.21:1, dark muted 6.79:1. User-picked card colors are not restricted.
- The mobile drawer temporarily compacts the hero/workspace, keeping the preview viewport above the controls. Tall posts remain scrollable at their readable zoom; Fit all shows their complete canvas. Controls below the fold scroll within the drawer. This is Chromium touch emulation, not a real iPhone/Android verification.
- Dates use UTC to make shared images reproducible. Relative dates are anchored, not continuously ticking. Post metrics remain upstream data and may change when the one-hour cache expires.

## Verification findings

- Captured 22 authentic syndication responses and one complete FxTwitter v2 response; 13 categories and the reported long-post regression are exercised through the live full-stack UI. Fixture provenance records the exact URLs and collection date. Deleted/protected/age-restricted reason handling has synthetic coverage because no real explicit-reason response was obtained.
- The long-post regression fails on the syndication-only implementation. The fixed real API returns 5,552 displayed characters, including the final paragraph, instead of 276. Saved-response tests also reject identity/content mismatches and preserve the available preview when the fallback is malformed, oversized, unavailable, or times out.
- Browser checks cover content, all style/background/frame controls, saved looks, keyboard and clipboard, fresh-context sharing, transparent alpha, loading/errors, light/dark, and width boundaries. Inspect actual exports in addition to checking dimensions.
- Compare native 2× Chromium screenshots at integer coordinates with text, photo/serif, glass, and four-photo exports. After fixing font embedding, normalized pixel RMSE was 0.00028–0.00135 for PNG and 0.00352–0.00479 for JPEG/WebP; differences are rasterization/compression, not missing images or changed line breaks. This is close visual matching, not a false claim of byte-identical lossy exports.
- Keep a native-capture comparison in the browser suite with a 0.01 normalized RMSE limit. Dimension-only tests previously missed the fallback-font defect. Keep the portrait width/aspect regression too; it failed before the fix (205 px image inside a 249 px media area).
- No external deployment, push, account creation, or posting to X is part of this implementation. The orb preview is for review, not a production deployment.
