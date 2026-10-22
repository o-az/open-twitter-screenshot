# Saved real syndication responses

Captured **2026-10-22 UTC**, directly from `https://cdn.syndication.twimg.com/tweet-result` using the exact `Number(id)` token algorithm, `lang=en`, and the current react-tweet feature list. `tweets.json` contains the complete parsed responses, grouped by provider (`syndication` and `fxtwitter`) and keyed by post ID, not handcrafted fixtures. Counts, profile pictures, card images, and note availability can change. Content belongs to its original authors; inclusion is for rendering/compatibility tests, not endorsement.

Reproduce: `node test/scripts/collect-tweet-fixtures.mjs <id> ...` from the repository root. The script updates only matching successful responses in `tweets.json`'s `syndication` map and preserves all other entries, including FxTwitter data. Unavailable responses are logged, not fabricated.

The runtime landing example is stored separately in `src/lib/tweet/example.json`, copied from the captured Naval response. Production code never imports these test fixtures; refreshing them does not change the landing example.

## Provenance and observed categories

Each link is the original public post; its exact ID is the key in the `syndication` map.

| Original source                                         | Verified response categories                                                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| https://x.com/naval/status/2044234462972784792          | Short text-only; authentic landing example                                                                               |
| https://x.com/jack/status/20                            | Historic text-only                                                                                                       |
| https://x.com/vercel/status/1683920951807971329         | Text, HTML escapes, real summary_large_image link card; starting ID from https://vercel.com/blog/introducing-react-tweet |
| https://x.com/reactiive_/status/2040511285998313827     | Video; starting ID from https://react-tweet.vercel.app/                                                                  |
| https://x.com/rauchg/status/1969515038512926823         | Video, id-only note_tweet: truncated long post (starting ID supplied by task)                                            |
| https://x.com/NASA/status/2042533098567422255           | One photo, empty visible text (starting ID supplied by task)                                                             |
| https://x.com/NASA/status/2040059740848283920           | One photo, emoji                                                                                                         |
| https://x.com/NASA/status/2038745567191310389           | One photo, mention, URL                                                                                                  |
| https://x.com/NASA/status/2039473910987534599           | Video, reply with real parent                                                                                            |
| https://x.com/NASA/status/2051361508181856362           | Four photos, URL                                                                                                         |
| https://x.com/sentry/status/2019528095926206551         | Real animated_gif, quote with link card, mention                                                                         |
| https://x.com/naval/status/1109704032204009473          | Real summary_large_image link card                                                                                       |
| https://x.com/rauchg/status/2089373735002526018         | Quote; nested mathematical Unicode and anomalous display range                                                           |
| https://x.com/BupaArabiaCare/status/2106710956420288518 | RTL Arabic reply, parent, hidden leading mention                                                                         |
| https://x.com/just_abdon/status/2093466365457764848     | RTL Arabic text-only                                                                                                     |
| https://x.com/Argona0x/status/2091946932037906774       | **Real Community Note** in birdwatch_pivot, video, quote, truncated long post                                            |
| https://x.com/HelpfulNotes/status/2092194908136222877   | Quote of the same Community-Noted post                                                                                   |
| https://x.com/NASA/status/2040114143626244576           | Two photos, reply with parent                                                                                            |
| https://x.com/NASA/status/2043798499771269626           | Two photos, URL                                                                                                          |
| https://x.com/NASA/status/2090487779268407625           | One photo, emoji and mentions (describes three wavelengths, NOT three separate photos)                                   |
| https://x.com/FelixSchlang/status/1878931655253192884   | Three photos, emoji and link                                                                                             |
| https://x.com/amorfati/status/2113139207052865759       | Reported long-post regression: 276 visible characters, id-only note_tweet, genuine 1200 × 60 photo                       |

Additional IDs were discovered through indexed public X post pages and then fetched live; category assertions are based on the saved syndication JSON, not search snippets. Attempts `1629307668568633344` and `1580661436132757506` returned empty/unavailable; `1336401448340713472` returned non-JSON. They are not coverage.

## Full long-post fallback response

The `fxtwitter["2113139207052865759"]` entry in `tweets.json` is the complete response fetched on **2026-10-22 UTC** from `https://api.fxtwitter.com/2/status/2113139207052865759`, then pretty-printed without editing the content. Reproduce with `curl --fail --silent --show-error https://api.fxtwitter.com/2/status/2113139207052865759`. FxTwitter is a third-party source, not an official X API; this fixture does not verify the author's factual claims.

The raw note body has 5,503 UTF-16 units and ends with “but they only help once installed.” Expanding its 11 links to display URLs yields 5,552 displayed characters. The media facet at `[277, 300]` refers to the truncated body's attachment URL, not the full note body: applying it blindly deletes prose. The regression requires that prose to remain intact. Tests of wrong identity, emoji offsets, unavailable responses, and malformed payloads are separately labeled synthetic.

Source interpretation follows [FxEmbed's Twitter processor](https://github.com/FxEmbed/FxEmbed/blob/main/packages/atmosphere/src/providers/twitter/processor.ts) and [its text-index helper](https://github.com/FxEmbed/FxEmbed/blob/main/packages/atmosphere/src/helpers/twitter-text-indices.ts): note entity indices are code points; legacy media facets may still describe the short body. The fallback uses only validated text/entities, not FxTwitter's counts or author/media objects.

## Known boundaries and uncertainties

- All requested real content categories were obtained, including 1/2/3/4 photos, GIF, quote, reply, emoji, RTL, long/truncated post, link card and Community Note. Syndication fixtures are **not full long-form text**: their id-only `note_tweet` remains marked truncated by normalization. Fetching can subsequently complete that body using the separately validated fallback.
- The original payload field for the captured note is `birdwatch_pivot.subtitle.text` plus `destinationUrl`. No note is invented from sensitivity or generic labels; rich note source entities/footer cannot fit the current model and are not returned. Other future note shapes are unsupported.
- Cards support only validated `summary` / `summary_large_image` bindings; polls, player/product cards, articles and unknown card formats are intentionally omitted. Raw responses are still saved intact.
- In `syndication["2089373735002526018"]` the quoted post has 155 code points but a supplied display end of 169. We clip overlong display ranges and skip out-of-range entities rather than switching index basis or rejecting the entire otherwise valid post. This can leave an unexpanded raw short URL in this anomalous nested response.
- Video/GIF `PostMedia.url` is a **raster poster**, not an MP4: this app produces still screenshots and the supplied model has no playback/variants fields. Video viewCount is not a post view count.
- `DELETED`, `PROTECTED`, and `AGE_RESTRICTED` explicit-reason payload tests are **synthetic compatibility cases**, not observed real responses. Empty objects, 404s and reasonless TweetTombstone remain ambiguous NOT_FOUND. Synthetic tests are explicitly named; parser/proxy rejection tests construct adversarial inputs, not fixture data.
- No paid credentials or API keys were used. Refreshing fixtures calls public X and FxTwitter endpoints; either may rate-limit or change at any time.
