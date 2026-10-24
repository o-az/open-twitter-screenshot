import raw from '#lib/tweet/example.json'
import { normalizeTweet } from '#lib/tweet/normalize.ts'

/** Public syndication snapshot with FxTwitter engagement counts captured 2026-10-24. */
export const examplePost = normalizeTweet(raw)
export default examplePost
