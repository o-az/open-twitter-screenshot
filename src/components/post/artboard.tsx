'use client'

import { useLayoutEffect, useRef, useState, type Ref } from 'react'
import type { Post } from '#lib/tweet/types.ts'
import type { StyleState } from '#lib/style/schema.ts'
import { backgroundCSS } from '#lib/style/presets.ts'
import { PostCard } from '#components/post/post-card.tsx'

export interface Dimensions {
  width: number
  height: number
}

export function Artboard({
  post,
  style,
  now,
  boardRef,
  onResize
}: {
  post: Post
  style: StyleState
  now: number
  boardRef?: Ref<HTMLDivElement>
  onResize?: (size: Dimensions) => void
}) {
  const card = useRef<HTMLDivElement>(null)
  const [cardHeight, setCardHeight] = useState(320)
  const width = style.cardWidth + style.backgroundPadding * 2
  const ratio = style.ratio === 'auto' ? null : style.ratio.split(':').map(Number)
  const height = ratio
    ? Math.round((width * ratio[1]) / ratio[0])
    : cardHeight + style.backgroundPadding * 2
  const fit = Math.min(1, Math.max(1, height - style.backgroundPadding * 2) / cardHeight)
  const background = backgroundCSS(style)

  useLayoutEffect(() => {
    if (!card.current) return
    const observer = new ResizeObserver(([entry]) =>
      setCardHeight(Math.ceil(entry.borderBoxSize[0]?.blockSize || entry.contentRect.height))
    )
    observer.observe(card.current)
    return () => observer.disconnect()
  }, [])
  useLayoutEffect(() => {
    onResize?.({ width, height })
  }, [width, height, onResize])

  return (
    <div
      ref={boardRef}
      className='artboard'
      data-testid='artboard'
      style={{ width, height, background }}>
      {style.grain && style.background !== 'transparent' && <div className='artboard-grain' />}
      <div
        className='post-position'
        style={{
          width: style.cardWidth,
          height: cardHeight,
          transform: `translate(-50%, -50%) scale(${fit})`
        }}>
        {style.glass && (
          <div
            className='glass-backing'
            style={{ borderRadius: style.radius }}
            aria-hidden='true'>
            <div
              style={{
                position: 'absolute',
                width: width / fit,
                height: height / fit,
                left: (style.cardWidth - width / fit) / 2,
                top: (cardHeight - height / fit) / 2,
                background,
                filter: 'blur(16px)'
              }}
            />
          </div>
        )}
        <div ref={card}>
          <PostCard
            post={post}
            style={style}
            now={now}
          />
        </div>
      </div>
    </div>
  )
}
