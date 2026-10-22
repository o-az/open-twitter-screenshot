'use client'

import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { Button, Skeleton, Tooltip } from '@heroui/react'
import { Maximize, Minus, Plus } from 'lucide-react'
import { Artboard, type Dimensions } from '#components/post/artboard.tsx'
import type { Post } from '#lib/tweet/types.ts'
import type { StyleState } from '#lib/style/schema.ts'

export function Preview({
  post,
  style,
  now,
  loading,
  example,
  boardRef,
  size,
  onResize
}: {
  post: Post
  style: StyleState
  now: number
  loading: boolean
  example: boolean
  boardRef: RefObject<HTMLDivElement | null>
  size: Dimensions
  onResize: (size: Dimensions) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const [area, setArea] = useState({ width: 700, height: 520 })
  const [zoom, setZoom] = useState<number | 'fit' | null>(null)
  const verticalPadding = area.height < 250 ? 12 : 36
  const fitWidth = Math.min(1, Math.max(1, area.width - 80) / size.width)
  const fit = Math.min(fitWidth, Math.max(1, area.height - verticalPadding * 2) / size.height)
  const tall = style.ratio === 'auto' && size.height > size.width * 2
  const scale = zoom === 'fit' ? fit : (zoom ?? (tall ? fitWidth : fit))
  useLayoutEffect(() => {
    if (!container.current) return
    const observer = new ResizeObserver(([entry]) =>
      setArea({
        width: entry.target.clientWidth,
        height: entry.target.clientHeight
      })
    )
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  useLayoutEffect(() => {
    if (loading) container.current?.scrollTo(0, 0)
  }, [loading])
  return (
    <section
      className='preview-workspace'
      aria-label='Live canvas preview'>
      <div className='canvas-heading'>
        <span>
          <span className='status-dot' />
          LIVE PREVIEW
        </span>
        <span>{example ? 'EXAMPLE POST · TRY YOUR OWN ABOVE' : `@${post.author.handle}`}</span>
      </div>
      <div
        className='preview-viewport'
        ref={container}
        role='region'
        aria-label='Scrollable post preview'
        tabIndex={0}
        style={{ padding: `${verticalPadding}px 40px` }}>
        <div
          className={`preview-art ${style.background === 'transparent' ? 'checkerboard' : ''}`}
          style={{ width: size.width * scale, height: size.height * scale }}>
          <div
            className='preview-zoom'
            style={{ transform: `scale(${scale})` }}>
            <Artboard
              post={post}
              style={style}
              now={now}
              boardRef={boardRef}
              onResize={onResize}
            />
          </div>
        </div>
        {loading && (
          <div
            className='loading-layer'
            role='status'
            aria-label='Loading post'>
            <div className='loading-card'>
              <div className='flex gap-3'>
                <Skeleton className='size-11 rounded-full' />
                <div className='flex flex-col gap-2'>
                  <Skeleton className='h-4 w-28 rounded' />
                  <Skeleton className='h-3 w-20 rounded' />
                </div>
              </div>
              <Skeleton className='h-5 w-full rounded' />
              <Skeleton className='h-5 w-4/5 rounded' />
              <Skeleton className='h-5 w-3/5 rounded' />
              <span>Finding your next good post…</span>
            </div>
          </div>
        )}
      </div>
      <div className='canvas-toolbar'>
        <span className='canvas-dimensions'>
          {size.width} × {size.height}
          <span>px</span>
        </span>
        <div className='zoom-controls'>
          <Button
            isIconOnly
            variant='ghost'
            size='sm'
            aria-label='Zoom out'
            isDisabled={scale <= 0.01}
            onPress={() => setZoom(Math.max(0.01, scale - 0.1))}>
            <Minus size={13} />
          </Button>
          <span>{Math.round(scale * 100)}%</span>
          <Button
            isIconOnly
            variant='ghost'
            size='sm'
            aria-label='Zoom in'
            onPress={() => setZoom(Math.min(2, scale + 0.1))}>
            <Plus size={13} />
          </Button>
          <div className='toolbar-divider' />
          <Tooltip>
            <Button
              className='zoom-fit'
              variant='ghost'
              size='sm'
              onPress={() => {
                setZoom('fit')
                container.current?.scrollTo(0, 0)
              }}>
              <Maximize size={13} />
              Fit all
            </Button>
            <Tooltip.Content>Show the entire image</Tooltip.Content>
          </Tooltip>
        </div>
      </div>
    </section>
  )
}
