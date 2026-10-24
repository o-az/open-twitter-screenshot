import { normalizeTweet } from '#lib/tweet/normalize.ts'
import { completeLongPosts } from '#lib/tweet/complete.ts'
import { fetchMetrics } from '#lib/tweet/metrics.ts'
import { parseTweetId, TweetException } from '#lib/tweet/parse.ts'
import type { TweetError, TweetErrorCode, TweetResult } from '#lib/tweet/types.ts'

export const SYNDICATION_FEATURES = [
  'tfw_timeline_list:',
  'tfw_follower_count_sunset:true',
  'tfw_tweet_edit_backend:on',
  'tfw_refsrc_session:on',
  'tfw_fosnr_soft_interventions_enabled:on',
  'tfw_show_birdwatch_pivots_enabled:on',
  'tfw_show_business_verified_badge:on',
  'tfw_duplicate_scribes_to_settings:on',
  'tfw_use_profile_image_shape_enabled:on',
  'tfw_show_blue_verified_badge:on',
  'tfw_legacy_timeline_sunset:true',
  'tfw_show_gov_verified_badge:on',
  'tfw_show_business_affiliate_badge:on',
  'tfw_tweet_edit_frontend:on'
].join(';')
const messages: Record<TweetErrorCode, string> = {
  MALFORMED_URL: 'Enter a valid X or Twitter post URL, or a numeric post ID.',
  DELETED: 'This post has been deleted.',
  PROTECTED: 'This post is protected.',
  AGE_RESTRICTED: 'This post is age restricted.',
  NOT_FOUND: 'This post is unavailable. It may be private or deleted.',
  RATE_LIMITED: 'X is receiving too many requests. Please try again shortly.',
  UNAVAILABLE: 'We could not load this post right now. Please try again.'
}
const failure = (code: TweetErrorCode): { error: TweetError } => ({
  error: { code, message: messages[code] }
})

function explicitReason(raw: unknown): TweetErrorCode | undefined {
  if (!raw || typeof raw !== 'object') return
  const reason = 'reason' in raw ? raw.reason : undefined
  // No guessing from sensitivity, generic tombstones, 403, or missing data.
  if (reason === 'deleted' || reason === 'Deleted') return 'DELETED'
  if (reason === 'protected' || reason === 'Protected') return 'PROTECTED'
  if (reason === 'age_restricted' || reason === 'AgeRestricted') return 'AGE_RESTRICTED'
}

export async function getTweet(input: string): Promise<TweetResult> {
  try {
    const id = parseTweetId(input)
    const url = new URL('https://cdn.syndication.twimg.com/tweet-result')
    url.search = new URLSearchParams({
      id,
      lang: 'en',
      features: SYNDICATION_FEATURES,
      token: ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '')
    }).toString()
    const response = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
      redirect: 'error'
    })
    if (response.status === 429) return failure('RATE_LIMITED')
    if (response.status === 404) return failure('NOT_FOUND')
    if (!response.ok) return failure('UNAVAILABLE')
    const raw: unknown = await response.json()
    const reason = explicitReason(raw)
    if (reason) return failure(reason)
    if (
      raw &&
      typeof raw === 'object' &&
      (Object.keys(raw).length === 0 ||
        ('__typename' in raw && raw.__typename === 'TweetTombstone'))
    )
      return failure('NOT_FOUND')
    const post = normalizeTweet(raw)
    if (post.id !== id) return failure('UNAVAILABLE')
    const [completed, metrics] = await Promise.all([
      completeLongPosts(raw, post),
      fetchMetrics(post)
    ])
    return { post: { ...completed, metrics: { ...completed.metrics, ...metrics } } }
  } catch (error) {
    return failure(error instanceof TweetException ? error.code : 'UNAVAILABLE')
  }
}
