'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const KEY = 'ots:controls-height'
const MIN = 140
const FLOOR = 80
const STEP = 16

const headerHeight = () => document.querySelector<HTMLElement>('.app-header')?.offsetHeight ?? 56
const actionsHeight = () =>
  document.querySelector<HTMLElement>('.mobile-actions')?.offsetHeight ?? 56
// Reserve less for the preview on short windows so the dock never pushes it off screen.
const previewMin = () => Math.min(260, Math.max(120, Math.round(window.innerHeight * 0.4)))
const maxHeight = () =>
  Math.max(FLOOR, Math.round(window.innerHeight - headerHeight() - actionsHeight() - previewMin()))
const minHeight = () => Math.min(MIN, maxHeight())
const clamp = (value: number) => Math.min(maxHeight(), Math.max(minHeight(), Math.round(value)))
// Same formula as the pre-hydration CSS default, min(30dvh, 240px), kept inside the bounds.
const defaultHeight = () => clamp(Math.min(window.innerHeight * 0.3, 240))

function readStored() {
  try {
    const value = Number(window.localStorage.getItem(KEY))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

function writeStored(value: number | null) {
  try {
    if (value === null) window.localStorage.removeItem(KEY)
    else window.localStorage.setItem(KEY, String(value))
  } catch {
    // Storage can be blocked; the height still works for this session.
  }
}

/** Draggable boundary between preview and the bottom controls (narrow layout only). */
export function useResizableDock(target: React.RefObject<HTMLElement | null>) {
  // The preferred height is kept as-is (null = responsive default); the rendered height is
  // always derived from it and clamped, so a shrunken window never loses the preference.
  const [stored, setStored] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [drag, setDrag] = useState<number | null>(null)
  const [, setViewport] = useState(0)
  const start = useRef({ y: 0, h: 0 })
  const latest = useRef<number | null>(null)

  useEffect(() => {
    setStored(readStored())
    setMounted(true)
    const onResize = () => setViewport(version => version + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const commit = useCallback((value: number | null) => {
    latest.current = null
    setDrag(null)
    setStored(value)
    writeStored(value)
  }, [])

  // Before mount there is no window to measure; the CSS default applies.
  const height = !mounted ? null : (drag ?? clamp(stored ?? defaultHeight()))
  const current = () => height ?? target.current?.getBoundingClientRect().height ?? 240

  const handleProps = {
    role: 'separator' as const,
    'aria-orientation': 'horizontal' as const,
    'aria-label': 'Resize preview and controls',
    'aria-valuemin': mounted ? minHeight() : MIN,
    'aria-valuemax': mounted ? maxHeight() : MIN,
    'aria-valuenow': height ?? MIN,
    tabIndex: 0,
    onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
      if (event.button !== 0) return
      event.currentTarget.setPointerCapture(event.pointerId)
      latest.current = null
      start.current = { y: event.clientY, h: current() }
    },
    onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
      const next = clamp(start.current.h + start.current.y - event.clientY)
      latest.current = next
      setDrag(next)
    },
    onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId)
      if (latest.current !== null) commit(latest.current)
      latest.current = null
    },
    onPointerCancel() {
      latest.current = null
      setDrag(null)
    },
    onLostPointerCapture() {
      setDrag(null)
    },
    onDoubleClick() {
      commit(null)
    },
    onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
      const keys: Record<string, number> = {
        ArrowUp: clamp(current() + STEP),
        ArrowDown: clamp(current() - STEP),
        Home: minHeight(),
        End: maxHeight()
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        commit(null)
      } else if (event.key in keys) {
        event.preventDefault()
        commit(keys[event.key])
      }
    }
  }

  return { height, dragging: drag !== null, handleProps }
}
