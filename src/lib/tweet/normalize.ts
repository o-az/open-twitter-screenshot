import { z } from 'zod'
import { metricKeys, type Post, type PostMedia, type PostSegment } from '#lib/tweet/types.ts'
import { ID_PATTERN } from '#lib/tweet/parse.ts'

const httpUrl = z
  .string()
  .url()
  .refine(value => {
    const u = new URL(value)
    return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password
  })
const httpsUrl = httpUrl.refine(value => value.startsWith('https://'))
const count = z.number().finite().nonnegative()
const dimensions = z.tuple([z.number().positive(), z.number().positive()])
const indices = z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])
const entity = z.object({
  indices,
  text: z.string().optional(),
  screen_name: z.string().optional(),
  expanded_url: httpUrl.optional(),
  display_url: z.string().optional(),
  url: httpUrl.optional()
})
const mediaSchema = z.object({
  type: z.enum(['photo', 'video', 'animated_gif']),
  media_url_https: httpsUrl,
  original_info: z
    .object({ width: z.number().positive(), height: z.number().positive() })
    .optional(),
  video_info: z.object({ aspect_ratio: dimensions }).optional(),
  ext_alt_text: z.string().optional()
})
const rawSchema = z.object({
  id_str: z.string().regex(ID_PATTERN),
  text: z.string(),
  created_at: z.string().refine(value => Number.isFinite(Date.parse(value))),
  user: z.object({
    name: z.string(),
    screen_name: z.string().regex(/^[A-Za-z0-9_]{1,15}$/),
    profile_image_url_https: httpsUrl,
    verified_type: z.string().optional(),
    is_blue_verified: z.boolean().optional()
  }),
  display_text_range: indices.optional(),
  entities: z
    .object({
      urls: z.array(entity).optional(),
      media: z.array(entity).optional(),
      hashtags: z.array(entity).optional(),
      user_mentions: z.array(entity).optional(),
      symbols: z.array(entity).optional()
    })
    .optional(),
  mediaDetails: z.array(mediaSchema).optional(),
  photos: z
    .array(
      z.object({
        url: httpsUrl,
        width: z.number().positive(),
        height: z.number().positive(),
        alt: z.string().optional()
      })
    )
    .optional(),
  video: z.object({ poster: httpsUrl, aspectRatio: dimensions }).optional(),
  favorite_count: count.optional(),
  conversation_count: count.optional(),
  reply_count: count.optional(),
  retweet_count: count.optional(),
  bookmark_count: count.optional(),
  view_count: count.optional(),
  note_tweet: z.unknown().optional(),
  quoted_tweet: z.unknown().optional(),
  parent: z.unknown().optional(),
  in_reply_to_screen_name: z
    .string()
    .regex(/^[A-Za-z0-9_]{1,15}$/)
    .optional(),
  in_reply_to_status_id_str: z.string().regex(ID_PATTERN).optional(),
  card: z.unknown().optional(),
  birdwatch_pivot: z.unknown().optional()
})

const decode = (text: string) =>
  text.replace(
    /&(?:amp|lt|gt|quot|apos|#39);/g,
    value =>
      ({
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&apos;': "'",
        '&#39;': "'"
      })[value] ?? value
  )
const noteSchema = z.object({
  subtitle: z.object({ text: z.string().min(1) }),
  destinationUrl: httpUrl
})
const binding = z.object({
  string_value: z.string().optional(),
  image_value: z.object({ url: httpsUrl }).optional()
})
const cardSchema = z.object({
  name: z.enum(['summary', 'summary_large_image']),
  url: httpUrl,
  binding_values: z.record(z.string(), binding)
})

export function normalizeTweet(raw: unknown): Post {
  return normalize(raw, 0)
}

function normalize(raw: unknown, depth: number): Post {
  const t = rawSchema.parse(raw)
  const chars = Array.from(t.text)
  const [start, suppliedEnd] = t.display_text_range ?? [0, chars.length]
  // Some real nested responses overrun the available code points. Clip the
  // range as Array.slice does upstream; never guess a different index basis.
  const end = Math.min(suppliedEnd, chars.length)
  if (start > end) throw new Error('Invalid post text range')
  const marked: { start: number; end: number; segment?: PostSegment }[] = []
  const add = (
    items: z.infer<typeof entity>[] | undefined,
    type: PostSegment['type'] | 'media' | 'symbol'
  ) => {
    for (const item of items ?? []) {
      const [a, b] = item.indices
      if (a < start || b > end || a >= b) continue
      const original = chars.slice(a, b).join('')
      let segment: PostSegment | undefined
      if (type === 'link')
        segment = {
          type,
          text: decode(item.display_url ?? original),
          href: item.expanded_url ?? item.url
        }
      if (type === 'mention')
        segment = {
          type,
          text: original,
          href: `https://x.com/${encodeURIComponent(item.screen_name ?? original.slice(1))}`
        }
      if (type === 'hashtag')
        segment = {
          type,
          text: original,
          href: `https://x.com/hashtag/${encodeURIComponent(item.text ?? original.slice(1))}`
        }
      if (type === 'symbol')
        segment = {
          type: 'link',
          text: original,
          href: `https://x.com/search?q=${encodeURIComponent(original)}`
        }
      marked.push({ start: a, end: b, segment })
    }
  }
  add(t.entities?.media, 'media')
  add(t.entities?.urls, 'link')
  add(t.entities?.user_mentions, 'mention')
  add(t.entities?.hashtags, 'hashtag')
  add(t.entities?.symbols, 'symbol')
  marked.sort((a, b) => a.start - b.start)
  const segments: PostSegment[] = []
  let cursor = start
  for (const item of marked) {
    if (item.start < cursor) continue
    if (cursor < item.start)
      segments.push({
        type: 'text',
        text: decode(chars.slice(cursor, item.start).join(''))
      })
    if (item.segment) segments.push(item.segment)
    cursor = item.end
  }
  if (cursor < end)
    segments.push({
      type: 'text',
      text: decode(chars.slice(cursor, end).join(''))
    })
  // Trim only trailing whitespace left by stripped attachment URLs.
  if (segments.at(-1)?.type === 'text')
    segments[segments.length - 1].text = segments[segments.length - 1].text.trimEnd()
  const media: PostMedia[] = (t.mediaDetails ?? []).map(m => ({
    type: m.type === 'animated_gif' ? 'gif' : m.type,
    url: m.media_url_https,
    width: m.original_info?.width ?? m.video_info?.aspect_ratio[0] ?? 1,
    height: m.original_info?.height ?? m.video_info?.aspect_ratio[1] ?? 1,
    alt: m.ext_alt_text ?? ''
  }))
  if (!media.length) {
    for (const p of t.photos ?? [])
      media.push({
        type: 'photo',
        url: p.url,
        width: p.width,
        height: p.height,
        alt: p.alt ?? ''
      })
    if (t.video)
      media.push({
        type: 'video',
        url: t.video.poster,
        width: t.video.aspectRatio[0],
        height: t.video.aspectRatio[1],
        alt: ''
      })
  }
  const post: Post = {
    id: t.id_str,
    author: {
      name: decode(t.user.name),
      handle: t.user.screen_name,
      avatar: t.user.profile_image_url_https,
      verified:
        t.user.verified_type === 'Business'
          ? 'gold'
          : t.user.verified_type === 'Government'
            ? 'gray'
            : t.user.is_blue_verified
              ? 'blue'
              : 'none'
    },
    text: segments.map(s => s.text).join(''),
    segments: segments.filter(s => s.text.length),
    createdAt: new Date(t.created_at).toISOString(),
    metrics: {},
    media
  }
  const counters = {
    likes: t.favorite_count,
    replies: t.conversation_count ?? t.reply_count,
    reposts: t.retweet_count,
    bookmarks: t.bookmark_count,
    views: t.view_count
  }
  for (const key of metricKeys) if (counters[key] !== undefined) post.metrics[key] = counters[key]
  if (t.note_tweet != null) post.isTruncated = true
  if (depth === 0) {
    if (t.quoted_tweet) {
      const result = rawSchema.safeParse(t.quoted_tweet)
      if (result.success) post.quotedPost = normalize(result.data, 1)
    }
    const parent = rawSchema.safeParse(t.parent)
    if (t.in_reply_to_screen_name || parent.success) {
      post.replyTo = {
        handle: t.in_reply_to_screen_name ?? (parent.success ? parent.data.user.screen_name : ''),
        ...(t.in_reply_to_status_id_str ? { id: t.in_reply_to_status_id_str } : {})
      }
      if (parent.success) {
        post.replyTo.post = normalize(parent.data, 1)
        post.replyTo.id ??= parent.data.id_str
      }
    }
  }
  const note = noteSchema.safeParse(t.birdwatch_pivot)
  if (note.success)
    post.communityNote = {
      text: note.data.subtitle.text,
      url: note.data.destinationUrl
    }
  const card = cardSchema.safeParse(t.card)
  if (card.success) {
    const b = card.data.binding_values
    const title = b.title?.string_value
    const matchingUrl = t.entities?.urls?.find(e => e.url === card.data.url)?.expanded_url
    if (title)
      post.linkCard = {
        url: matchingUrl ?? card.data.url,
        title: decode(title),
        ...(b.description?.string_value ? { description: decode(b.description.string_value) } : {}),
        ...(b.domain?.string_value ? { domain: b.domain.string_value } : {}),
        ...(b.photo_image_full_size?.image_value?.url || b.thumbnail_image?.image_value?.url
          ? {
              image:
                b.photo_image_full_size?.image_value?.url ?? b.thumbnail_image?.image_value?.url
            }
          : {})
      }
  }
  return post
}
