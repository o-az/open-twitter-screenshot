'use client'

import {
  Button,
  ColorArea,
  ColorField,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  Label,
  ListBox,
  Select,
  Slider,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip
} from '@heroui/react'
import { Info } from 'lucide-react'

export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit = 'px',
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}) {
  return (
    <Slider
      className='studio-slider'
      value={value}
      minValue={min}
      maxValue={max}
      step={step}
      onChange={next => onChange(Array.isArray(next) ? next[0] : next)}>
      <div className='control-heading'>
        <Label>{label}</Label>
        <Slider.Output>
          {value}
          {unit}
        </Slider.Output>
      </div>
      <Slider.Track>
        <Slider.Fill />
        <Slider.Thumb />
      </Slider.Track>
    </Slider>
  )
}

export function Toggle({
  label,
  value,
  onChange,
  unavailable
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  unavailable?: string
}) {
  return (
    <div className='toggle-row'>
      <Switch
        aria-label={label}
        isSelected={value && !unavailable}
        onChange={onChange}
        isDisabled={!!unavailable}>
        <Switch.Content>
          <span>{label}</span>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
      {unavailable && (
        <Tooltip>
          <Button
            isIconOnly
            variant='ghost'
            size='sm'
            aria-label={`Why ${label.toLowerCase()} is unavailable`}>
            <Info size={13} />
          </Button>
          <Tooltip.Content>{unavailable}</Tooltip.Content>
        </Tooltip>
      )}
    </div>
  )
}

export function Choice<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: T
  options: readonly { id: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className='choice-field'>
      <span className='control-label'>{label}</span>
      <ToggleButtonGroup
        className='choice-group'
        aria-label={label}
        selectedKeys={[value]}
        onSelectionChange={keys => {
          const [key] = keys
          const option = options.find(o => o.id === key)
          if (option) onChange(option.id)
        }}
        disallowEmptySelection
        size='sm'>
        {options.map(option => (
          <ToggleButton
            key={option.id}
            id={option.id}>
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  )
}

export function DropdownField<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: T
  options: readonly { id: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <Select
      className='studio-select'
      value={value}
      onChange={key => {
        const option = options.find(o => o.id === key)
        if (option) onChange(option.id)
      }}>
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map(option => (
            <ListBox.Item
              key={option.id}
              id={option.id}
              textValue={option.label}>
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

export function ColorControl({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className='color-control'>
      <span className='control-label'>{label}</span>
      <ColorPicker
        value={value}
        onChange={color => onChange(color.toString('hex'))}>
        <ColorPicker.Trigger
          className='color-trigger'
          aria-label={`${label} color`}>
          <ColorSwatch size='xs' />
          <span>{value.toUpperCase()}</span>
        </ColorPicker.Trigger>
        <ColorPicker.Popover className='color-popover'>
          <ColorArea
            aria-label={`${label} color area`}
            colorSpace='hsb'
            xChannel='saturation'
            yChannel='brightness'>
            <ColorArea.Thumb />
          </ColorArea>
          <ColorSlider
            aria-label={`${label} hue`}
            channel='hue'
            colorSpace='hsb'>
            <ColorSlider.Track>
              <ColorSlider.Thumb />
            </ColorSlider.Track>
          </ColorSlider>
          <ColorField aria-label={`${label} hex`}>
            <ColorField.Group>
              <ColorField.Prefix>
                <ColorSwatch size='xs' />
              </ColorField.Prefix>
              <ColorField.Input />
            </ColorField.Group>
          </ColorField>
          <ColorSwatchPicker
            aria-label={`${label} presets`}
            size='xs'>
            {['#ffffff', '#18181b', '#71717a', '#ff824d', '#b8a8f0', '#a7c5b5', '#eabbd6'].map(
              color => (
                <ColorSwatchPicker.Item
                  color={color}
                  key={color}>
                  <ColorSwatchPicker.Swatch />
                  <ColorSwatchPicker.Indicator />
                </ColorSwatchPicker.Item>
              )
            )}
          </ColorSwatchPicker>
        </ColorPicker.Popover>
      </ColorPicker>
    </div>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className='section-label'>{children}</h3>
}
