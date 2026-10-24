import { z } from 'zod'
import { metricKeys, type Post } from '#lib/tweet/types.ts'
import { ID_PATTERN } from '#lib/tweet/parse.ts'

const count = z.number().int().nonnegative().safe().nullish()
const responseSchema = z.object({
  code: z.literal(200),
  tweet: z.object({
    id: z.string().regex(ID_PATTERN),
    author: z.object({ screen_name: z.string() }),
    replies: count,
    retweets: count,
    quotes: count,
    likes: count,
    bookmarks: count,
    views: count
  })
})

/** Syndication owns the content; FxTwitter fills in its missing engagement counts. */
export async function fetchMetrics(post: Post): Promise<Post['metrics']> {
  try {
    const response = await fetch(
      `https://api.fxtwitter.com/${encodeURIComponent(post.author.handle)}/status/${post.id}`,
      {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(6000),
        redirect: 'error',
        headers: { Accept: 'application/json', 'User-Agent': 'open-twitter-screenshot' }
      }
    )
    if (!response.ok || !response.body) {
      await response.body?.cancel()
      return {}
    }
    // Bound the untrusted response, including chunked bodies without Content-Length.
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let bytes = 0
    let body = ''
    try {
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        bytes += chunk.value.byteLength
        if (bytes > 1024 * 1024) return {}
        body += decoder.decode(chunk.value, { stream: true })
      }
      body += decoder.decode()
    } finally {
      await reader.cancel()
    }
    const { tweet } = responseSchema.parse(JSON.parse(body))
    if (
      tweet.id !== post.id ||
      tweet.author.screen_name.toLowerCase() !== post.author.handle.toLowerCase()
    )
      return {}

    const metrics: Post['metrics'] = {}
    const counters = {
      replies: tweet.replies,
      // X's repost total includes quote posts as well as ordinary reposts.
      reposts: tweet.retweets == null ? undefined : tweet.retweets + (tweet.quotes ?? 0),
      likes: tweet.likes,
      bookmarks: tweet.bookmarks,
      views: tweet.views
    }
    for (const key of metricKeys) {
      const value = counters[key]
      if (value != null && Number.isSafeInteger(value)) metrics[key] = value
    }
    return metrics
  } catch {
    // Timeouts, private posts, and upstream schema changes keep syndication usable.
    return {}
  }
}
