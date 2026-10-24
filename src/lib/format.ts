export function formatNumber(value: number, compact = true): string {
  return new Intl.NumberFormat(
    'en-US',
    compact && value >= 1000
      ? { notation: 'compact', maximumFractionDigits: 1 }
      : { maximumFractionDigits: 0 }
  ).format(value)
}

export function formatDate(
  iso: string,
  mode: 'relative' | 'date' | 'datetime' | 'hidden',
  now: number,
  local = false
): string {
  const date = new Date(iso)
  if (mode === 'hidden' || !Number.isFinite(date.getTime())) return ''
  if (mode === 'relative') {
    const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000))
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }
  const zone = local ? {} : { timeZone: 'UTC' }
  const day = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...zone
  }).format(date)
  if (mode === 'date') return day
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    ...zone
  }).format(date)
  return `${time} · ${day}${local ? '' : ' UTC'}`
}
