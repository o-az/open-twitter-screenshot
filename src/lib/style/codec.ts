import { defaultStyle, styleSchema, type StyleState } from '#lib/style/schema.ts'

export function encodeStyle(style: StyleState): string {
  const diff = Object.fromEntries(
    styleSchema
      .keyof()
      .options.filter(key => style[key] !== defaultStyle[key])
      .map(key => [key, style[key]])
  )
  const bytes = new TextEncoder().encode(JSON.stringify(diff))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeStyle(encoded: string): StyleState | null {
  if (encoded.length > 220000 || !/^[\w-]+$/.test(encoded)) return null
  try {
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
    const value: unknown = JSON.parse(
      new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)))
    )
    const result = styleSchema.safeParse(value)
    return result.success ? result.data : null
  } catch {
    return null
  }
}
