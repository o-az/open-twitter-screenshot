import { Button } from '@heroui/react'
import { Check, Copy, Download, LockKeyhole } from 'lucide-react'
import type { StyleState, UpdateStyle } from '#lib/style/schema.ts'
import type { Dimensions } from '#components/post/artboard.tsx'
import { Choice, Range, SectionTitle } from '#components/studio/controls.tsx'

export function FramePanel({ style, update }: { style: StyleState; update: UpdateStyle }) {
  return (
    <div className='panel-fields'>
      <div>
        <SectionTitle>Made to fit</SectionTitle>
        <p className='panel-note'>
          Pick a home for your post. The card always stays centered, never cropped.
        </p>
      </div>
      <div className='ratio-grid'>
        {(
          [
            { id: 'auto', label: 'Auto', detail: 'Hug content', ratio: 1.3 },
            { id: '1:1', label: 'Square', detail: '1:1', ratio: 1 },
            { id: '4:5', label: 'Portrait', detail: '4:5', ratio: 0.8 },
            { id: '16:9', label: 'Landscape', detail: '16:9', ratio: 16 / 9 },
            { id: '9:16', label: 'Story', detail: '9:16', ratio: 9 / 16 },
            { id: '3:2', label: 'Classic', detail: '3:2', ratio: 1.5 }
          ] as const
        ).map(ratio => (
          <Button
            key={ratio.id}
            className={`ratio-button ${style.ratio === ratio.id ? 'is-selected' : ''}`}
            aria-pressed={style.ratio === ratio.id}
            onPress={() => update('ratio', ratio.id)}>
            <span
              className='ratio-outline'
              style={{ width: 30 * Math.min(1.5, ratio.ratio), height: 30 }}
            />
            <strong>{ratio.label}</strong>
            <small>{ratio.detail}</small>
            {style.ratio === ratio.id && (
              <Check
                size={12}
                className='ratio-check'
              />
            )}
          </Button>
        ))}
      </div>
      <Range
        label='Canvas padding'
        value={style.backgroundPadding}
        min={0}
        max={180}
        step={4}
        onChange={v => update('backgroundPadding', v)}
      />
      <p className='panel-note'>
        Long posts scale down to fit fixed frames. Choose Auto to keep their text at full size.
      </p>
    </div>
  )
}

export function ExportPanel({
  style,
  update,
  size,
  busy,
  disabled,
  onExport
}: {
  style: StyleState
  update: UpdateStyle
  size: Dimensions
  busy: boolean
  disabled: boolean
  onExport: (copy?: boolean) => void
}) {
  return (
    <div className='panel-fields'>
      <Choice
        label='File format'
        value={style.format}
        onChange={v => update('format', v)}
        options={[
          { id: 'png', label: 'PNG' },
          { id: 'jpeg', label: 'JPEG' },
          { id: 'webp', label: 'WebP' },
          { id: 'svg', label: 'SVG' }
        ]}
      />
      <p className='panel-note'>
        {style.format === 'svg'
          ? 'A portable SVG with an embedded, high-resolution image. Identical appearance, not editable vector text.'
          : style.format === 'jpeg'
            ? 'A lightweight image. Transparent backgrounds become white.'
            : style.format === 'webp'
              ? 'Small file, sharp details. Supports transparency.'
              : 'Lossless quality, crisp text, and full transparency.'}
      </p>
      <Choice
        label='Resolution'
        value={String(style.scale)}
        onChange={v => update('scale', Number(v) as StyleState['scale'])}
        options={[
          { id: '1', label: '1×' },
          { id: '2', label: '2×' },
          { id: '3', label: '3×' },
          { id: '4', label: '4×' }
        ]}
      />
      {(style.format === 'jpeg' || style.format === 'webp') && (
        <Range
          label='Image quality'
          value={style.quality}
          min={40}
          max={100}
          unit='%'
          onChange={v => update('quality', v)}
        />
      )}
      <div className='export-size'>
        <span>READY FOR THE BIG SCREEN</span>
        <strong>
          {size.width * style.scale} <span>×</span> {size.height * style.scale}
        </strong>
        <small>pixels · {style.scale === 2 ? 'Retina ready' : `${style.scale}× resolution`}</small>
      </div>
      <Button
        className='download-button'
        isPending={busy}
        isDisabled={disabled}
        onPress={() => onExport()}>
        <Download size={16} />
        Download {style.format.toUpperCase()}
      </Button>
      <Button
        variant='secondary'
        isDisabled={disabled}
        onPress={() => onExport(true)}>
        <Copy size={15} />
        Copy image as PNG
      </Button>
      <div className='privacy-note'>
        <LockKeyhole size={14} />
        <p>
          Rendered in your browser.
          <br />
          No watermarks. No sign-up. Yours to share.
        </p>
      </div>
    </div>
  )
}
