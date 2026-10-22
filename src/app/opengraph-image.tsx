import { ImageResponse } from 'next/og'
import { site } from '#config/site.ts'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = site.description

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#161616',
        color: '#f8f7f5',
        padding: 72,
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: 'sans-serif'
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, fontSize: 30 }}>
        <div
          style={{
            background: '#ff824d',
            color: '#21150f',
            borderRadius: 14,
            padding: '5px 14px',
            fontWeight: 900
          }}>
          n
        </div>
        {site.name}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          fontSize: 76,
          letterSpacing: -4,
          lineHeight: 1.1
        }}>
        <span>Good posts.</span>
        <span style={{ color: '#ff9b72' }}>Beautifully framed.</span>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 24,
          color: '#a9a6a3'
        }}>
        <span>One link. Your style. Ready to share.</span>
        <span>No sign-up. Just good design. ↗</span>
      </div>
    </div>,
    size
  )
}
