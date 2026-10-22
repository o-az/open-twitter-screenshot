/* Native images keep the exact same-origin resource in the preview and exported DOM. */
import type { CSSProperties } from 'react'
import type { Metric, Post, PostMedia, Verification } from '#lib/tweet/types.ts'
import { fonts, type StyleState } from '#lib/style/schema.ts'
import { formatDate, formatNumber } from '#lib/format.ts'

function proxy(url: string) {
  return `/api/img?url=${encodeURIComponent(url)}`
}

export function VerifiedBadge({ type }: { type: Verification }) {
  if (type === 'none') return null
  return (
    <svg
      width='20'
      height='20'
      viewBox='0 0 24 24'
      role='img'
      aria-label={`${type} verified`}
      style={{
        flexShrink: 0,
        color: { blue: '#1d9bf0', gold: '#d5a227', gray: '#82909e' }[type]
      }}>
      <path
        fill='currentColor'
        d='m22.25 12-2.07-2.37.29-3.13-3.06-.7-1.6-2.7L12 4.34 9.19 3.1l-1.6 2.7-3.06.7.29 3.13L2.75 12l2.07 2.37-.29 3.13 3.06.7 1.6 2.7L12 19.66l2.81 1.24 1.6-2.7 3.06-.7-.29-3.13L22.25 12Z'
      />
      <path
        fill='#fff'
        d='m10.5 16.2-3.7-3.7 1.4-1.4 2.3 2.3 5.3-5.3 1.4 1.4-6.7 6.7Z'
      />
    </svg>
  )
}

const metricPaths: Record<Metric, string> = {
  replies:
    'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z',
  reposts: 'm17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3',
  likes:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  bookmarks: 'M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z',
  views: 'M4 20V10m5 10V4m6 16v-8m5 8V7'
}
export const metricNames: Record<Metric, string> = {
  replies: 'Replies',
  reposts: 'Reposts',
  likes: 'Likes',
  bookmarks: 'Bookmarks',
  views: 'Views'
}

function MediaGrid({ media }: { media: PostMedia[] }) {
  if (!media.length) return null
  return (
    <div className={`post-media media-${Math.min(media.length, 4)}`}>
      {media.slice(0, 4).map((item, index) => (
        <div
          className='media-item'
          key={`${item.url}-${index}`}
          style={
            media.length === 1
              ? {
                  width: '100%',
                  aspectRatio: `${item.width} / ${item.height}`
                }
              : undefined
          }>
          <img
            src={proxy(item.url)}
            alt={item.alt || `${item.type === 'photo' ? 'Photo' : 'Video poster'} ${index + 1}`}
            width={item.width}
            height={item.height}
          />
          {item.type !== 'photo' && (
            <span
              className='media-play'
              aria-label={item.type === 'gif' ? 'GIF poster' : 'Video poster'}>
              {item.type === 'gif' ? (
                'GIF'
              ) : (
                <svg
                  width='26'
                  height='26'
                  viewBox='0 0 24 24'
                  aria-hidden='true'>
                  <path
                    fill='currentColor'
                    d='m8 4 13 8-13 8V4Z'
                  />
                </svg>
              )}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function PostBody({
  post,
  style,
  nested = false
}: {
  post: Post
  style: StyleState
  nested?: boolean
}) {
  return (
    <>
      {(style.avatar || style.displayName || style.handle || style.verified) && (
        <div className='post-author'>
          {style.avatar && post.author.avatar && (
            <img
              className='post-avatar'
              src={proxy(post.author.avatar)}
              alt=''
              width={nested ? 28 : 44}
              height={nested ? 28 : 44}
            />
          )}
          <div className='post-identity'>
            <div className='post-name'>
              {style.displayName && <span dir='auto'>{post.author.name}</span>}
              {style.verified && <VerifiedBadge type={post.author.verified} />}
            </div>
            {style.handle && <div className='post-handle'>@{post.author.handle}</div>}
          </div>
          {!nested && (
            <svg
              className='post-x'
              width='23'
              height='23'
              viewBox='0 0 24 24'
              aria-label='X'>
              <path
                fill='currentColor'
                d='M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.4l7.3-8.5L1.8 2h6.5l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.4 3.9H5.6L17.8 20Z'
              />
            </svg>
          )}
        </div>
      )}
      {style.reply && post.replyTo && (
        <div className='post-reply'>
          Replying to <span style={{ color: style.accentColor }}>@{post.replyTo.handle}</span>
        </div>
      )}
      <div
        className='post-text'
        dir='auto'>
        {post.segments.length
          ? post.segments.map((segment, index) => (
              <span
                key={index}
                style={segment.type !== 'text' ? { color: style.accentColor } : undefined}>
                {segment.text}
              </span>
            ))
          : post.text}
      </div>
      {post.isTruncated && <div className='post-truncated'>Read the full post on X ↗</div>}
      {style.media && <MediaGrid media={post.media} />}
      {style.linkCard && post.linkCard && (
        <div className='post-link-card'>
          {post.linkCard.image && (
            <img
              src={proxy(post.linkCard.image)}
              alt='Link preview'
              width='520'
              height='260'
            />
          )}
          <div>
            <span className='post-handle'>
              {post.linkCard.domain || new URL(post.linkCard.url).hostname}
            </span>
            <strong>{post.linkCard.title}</strong>
            {post.linkCard.description && <p>{post.linkCard.description}</p>}
          </div>
        </div>
      )}
      {!nested && style.quote && post.quotedPost && (
        <div className='post-quote'>
          <PostBody
            post={post.quotedPost}
            style={style}
            nested
          />
        </div>
      )}
      {style.note && post.communityNote && (
        <div className='post-note'>
          <strong>Readers added context</strong>
          <p dir='auto'>{post.communityNote.text}</p>
        </div>
      )}
    </>
  )
}

export function PostCard({
  post,
  style,
  now = 0
}: {
  post: Post
  style: StyleState
  now?: number
}) {
  const shadow = {
    none: 'none',
    soft: '0 12px 36px -10px #18142a24, 0 2px 6px #18142a08',
    strong: '0 24px 60px -10px #18142a55, 0 6px 16px #18142a22',
    glow: `0 0 48px ${style.accentColor}66`
  }[style.shadow]
  const metrics = (Object.keys(metricNames) as Metric[]).filter(
    key => style[key] && post.metrics[key] !== undefined
  )
  const css: CSSProperties = {
    width: style.cardWidth,
    padding: style.padding,
    borderRadius: style.radius,
    color: style.textColor,
    fontFamily: fonts[style.font],
    fontSize: style.fontSize,
    background: style.glass ? `${style.cardColor}b8` : style.cardColor,
    border: style.border
      ? `${style.borderWidth}px ${style.borderStyle === 'dashed' ? 'dashed' : 'solid'} ${style.borderStyle === 'gradient' ? 'transparent' : style.borderColor}`
      : '0 solid transparent',
    boxShadow: shadow,
    '--post-secondary': style.secondaryColor
  } as CSSProperties
  return (
    <article
      className='post-card'
      data-post-id={post.id}
      style={css}>
      {style.border && style.borderStyle === 'gradient' && (
        <div
          className='post-gradient-border'
          aria-hidden='true'
          style={{
            position: 'absolute',
            inset: -style.borderWidth,
            padding: style.borderWidth,
            borderRadius: style.radius,
            pointerEvents: 'none',
            background: `linear-gradient(135deg, ${style.accentColor}, ${style.borderColor})`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude'
          }}
        />
      )}
      {style.thread && post.replyTo?.post && (
        <div className='post-parent'>
          <PostBody
            post={post.replyTo.post}
            style={style}
            nested
          />
        </div>
      )}
      <PostBody
        post={post}
        style={style}
      />
      {style.timestamp !== 'hidden' && (
        <div className='post-timestamp'>{formatDate(post.createdAt, style.timestamp, now)}</div>
      )}
      {!!metrics.length && (
        <div className='post-metrics'>
          {metrics.map(key => (
            <span
              key={key}
              className='post-metric'
              aria-label={`${metricNames[key]}: ${post.metrics[key]}`}>
              {style.metricStyle !== 'numbers' && (
                <svg
                  width='18'
                  height='18'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.65'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  aria-hidden='true'>
                  <path d={metricPaths[key]} />
                </svg>
              )}
              {formatNumber(post.metrics[key]!, style.metricStyle === 'compact')}
              {style.metricStyle === 'numbers' && <small>{metricNames[key]}</small>}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
