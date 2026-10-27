import { metricKeys, type Post } from '#lib/tweet/types.ts'
import type { StyleState, UpdateStyle } from '#lib/style/schema.ts'
import { metricNames } from '#components/post/post-card.tsx'
import { DropdownField, SectionTitle, Toggle } from '#components/studio/controls.tsx'

export function ContentPanel({
  post,
  style,
  update
}: {
  post: Post
  style: StyleState
  update: UpdateStyle
}) {
  return (
    <div className='panel-fields'>
      <div>
        <SectionTitle>Author</SectionTitle>
        <Toggle
          label='Avatar'
          value={style.avatar}
          onChange={v => update('avatar', v)}
          unavailable={!post.author.avatar ? "X didn't return an avatar for this post." : undefined}
        />
        <Toggle
          label='Display name'
          value={style.displayName}
          onChange={v => update('displayName', v)}
        />
        <Toggle
          label='Username'
          value={style.handle}
          onChange={v => update('handle', v)}
        />
        <Toggle
          label='Verified badge'
          value={style.verified}
          onChange={v => update('verified', v)}
          unavailable={
            post.author.verified === 'none'
              ? 'This author has no verified badge in the response.'
              : undefined
          }
        />
      </div>
      <DropdownField
        label='Timestamp'
        value={style.timestamp}
        onChange={v => update('timestamp', v)}
        options={[
          { id: 'relative', label: 'Relative time' },
          { id: 'date', label: 'Full date' },
          { id: 'datetime', label: 'Time + date' },
          { id: 'hidden', label: 'Hidden' }
        ]}
      />
      <div>
        <SectionTitle>Post details</SectionTitle>
        {(
          [
            {
              key: 'media',
              label: 'Photos & video',
              available: !!post.media.length
            },
            {
              key: 'quote',
              label: 'Quoted post',
              available: !!post.quotedPost
            },
            { key: 'reply', label: 'Reply context', available: !!post.replyTo },
            {
              key: 'thread',
              label: 'Show as thread context',
              available: !!post.replyTo?.post
            },
            {
              key: 'note',
              label: 'Community Note',
              available: !!post.communityNote
            },
            {
              key: 'linkCard',
              label: 'Link preview',
              available: !!post.linkCard
            },
            {
              key: 'linkCardImage',
              label: 'Link preview image',
              available: !!post.linkCard?.image
            }
          ] as const
        ).map(({ key, label, available }) => (
          <Toggle
            key={key}
            label={label}
            value={style[key]}
            onChange={v => update(key, v)}
            unavailable={
              !available
                ? `X didn't return ${label.toLowerCase()} for this post.`
                : key === 'linkCardImage' && !style.linkCard
                  ? 'Turn on Link preview to use this.'
                  : undefined
            }
          />
        ))}
      </div>
      <div>
        <SectionTitle>Engagement</SectionTitle>
        {metricKeys.map(key => (
          <Toggle
            key={key}
            label={metricNames[key]}
            value={style[key]}
            onChange={v => update(key, v)}
            unavailable={
              post.metrics[key] === undefined
                ? `X's public endpoint didn't return ${key}. We never invent numbers.`
                : undefined
            }
          />
        ))}
      </div>
      <DropdownField
        label='Metric style'
        value={style.metricStyle}
        onChange={v => update('metricStyle', v)}
        options={[
          { id: 'icons', label: 'Icons + numbers' },
          { id: 'numbers', label: 'Numbers only' },
          { id: 'compact', label: 'Compact · 1.2K' }
        ]}
      />
      <p className='panel-note'>Your post stays authentic. Only its presentation changes.</p>
    </div>
  )
}
