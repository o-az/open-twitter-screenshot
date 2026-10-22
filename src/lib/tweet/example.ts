import raw from '#lib/tweet/example.json'
import { normalizeTweet } from '#lib/tweet/normalize.ts'

/** Authentic public text, captured from syndication on 2026-10-22; no live request. */
export const examplePost = normalizeTweet(raw)
export default examplePost
