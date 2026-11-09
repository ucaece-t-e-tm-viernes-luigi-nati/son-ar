'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createGig } from '@/app/actions/business'
import type { ActionState } from '@/app/actions/social'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function GigForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createGig, { ok: false })
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Nueva convocatoria</h2>
      <div className="flex flex-col gap-2">
        <label htmlFor="gig-title" className="text-sm font-medium">Título</label>
        <Input id="gig-title" name="title" required maxLength={80} placeholder="Viernes de rock en vivo" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="gig-date" className="text-sm font-medium">Fecha</label>
          <Input id="gig-date" name="date" type="date" required min="2026-10-24" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="gig-fee" className="text-sm font-medium">Cachet (ARS)</label>
          <Input id="gig-fee" name="fee" type="number" min={0} step={1000} required placeholder="150000" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="gig-genres" className="text-sm font-medium">Géneros</label>
        <Input id="gig-genres" name="genres" required placeholder="Rock, Indie" />
        <p className="text-xs text-muted-foreground">Separados por coma, hasta 5.</p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="gig-desc" className="text-sm font-medium">Descripción</label>
        <Textarea id="gig-desc" name="description" rows={3} maxLength={500} placeholder="Set de 60 minutos, backline incluido…" />
      </div>
      {state.message && (
        <p role="status" className={state.ok ? 'text-sm text-success' : 'text-sm text-destructive'}>
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Publicando…' : 'Publicar convocatoria'}
      </Button>
    </form>
  )
}
