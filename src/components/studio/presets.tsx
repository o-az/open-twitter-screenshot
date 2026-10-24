'use client'

import { useState } from 'react'
import { Button, Form, Input, Label, Modal, TextField, toast } from '@heroui/react'
import { Plus, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { backgroundCSS, looks } from '#lib/style/presets.ts'
import { styleSchema, type StyleState } from '#lib/style/schema.ts'
import { site } from '#config/site.ts'
import type { Post } from '#lib/tweet/types.ts'
import { PostCard } from '#components/post/post-card.tsx'

const savedSchema = z
  .array(z.object({ name: z.string().min(1).max(24), style: styleSchema }))
  .max(12)
const storageKey = `${site.storageKey}-presets`

export function Presets({
  post,
  style,
  setStyle,
  now
}: {
  post: Post
  style: StyleState
  setStyle: (style: StyleState) => void
  now: number
}) {
  const [saved, setSaved] = useState<{ name: string; style: StyleState }[]>(() => {
    try {
      return savedSchema.parse(JSON.parse(localStorage.getItem(storageKey) || '[]'))
    } catch {
      return []
    }
  })
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  function persist(next: typeof saved) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setSaved(next)
      return true
    } catch {
      toast.danger("Your browser couldn't save this preset. Storage may be full or disabled.")
      return false
    }
  }
  return (
    <section
      className='presets'
      aria-label='One-click looks'>
      <div className='presets-heading'>
        <div>
          <span className='section-label'>A starting point</span>
          <span className='preset-subtitle'>One click. A whole new mood.</span>
        </div>
        <Button
          variant='ghost'
          size='sm'
          onPress={() => setOpen(true)}>
          <Plus size={13} />
          Save look
        </Button>
      </div>
      <div className='looks-grid'>
        {[...looks, ...saved].map((look, index) => (
          <div
            className='look-item'
            key={`${look.name}-${index}`}>
            <Button
              className={`look-button ${JSON.stringify(style) === JSON.stringify(look.style) ? 'is-selected' : ''}`}
              aria-label={`Apply ${look.name} look`}
              aria-pressed={JSON.stringify(style) === JSON.stringify(look.style)}
              onPress={() => setStyle(look.style)}
              style={{ background: backgroundCSS(look.style) }}>
              <div
                className='look-mini'
                aria-hidden='true'>
                <PostCard
                  post={post}
                  style={{ ...look.style, cardWidth: 520 }}
                  now={now}
                />
              </div>
            </Button>
            <div className='look-label'>
              {look.name}
              {index >= looks.length && (
                <Button
                  isIconOnly
                  variant='ghost'
                  size='sm'
                  aria-label={`Delete ${look.name} preset`}
                  onPress={() => persist(saved.filter((_, i) => i !== index - looks.length))}>
                  <Trash2 size={10} />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <Modal.Backdrop
        isOpen={open}
        onOpenChange={setOpen}>
        <Modal.Container size='sm'>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Keep this feeling</Modal.Heading>
            </Modal.Header>
            <Form
              onSubmit={event => {
                event.preventDefault()
                if (!name.trim()) return
                if (saved.length >= 12) {
                  toast.danger('You have 12 saved looks. Remove one to make room.')
                  return
                }
                if (persist([...saved, { name: name.trim(), style }])) {
                  setOpen(false)
                  setName('')
                  toast.success('Look saved to this browser')
                }
              }}>
              <Modal.Body>
                <p className='panel-note'>Your current design, ready for the next good post.</p>
                <TextField
                  value={name}
                  onChange={setName}
                  isRequired
                  maxLength={24}>
                  <Label>Look name</Label>
                  <Input
                    placeholder='Sunday morning'
                    autoFocus
                  />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  slot='close'
                  variant='ghost'>
                  Cancel
                </Button>
                <Button type='submit'>Save look</Button>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </section>
  )
}
