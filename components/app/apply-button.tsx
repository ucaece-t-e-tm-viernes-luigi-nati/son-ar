'use client'

import { useTransition } from 'react'
import { Check } from 'lucide-react'
import { applyToGig } from '@/app/app/actions'
import { Button } from '@/components/ui/button'

export function ApplyButton({ gigId, applied, disabled = false }: { gigId: string; applied: boolean; disabled?: boolean }) {
  const [pending, start] = useTransition()
  if (applied) {
    return (
      <Button variant="secondary" disabled>
        <Check data-icon="inline-start" /> Postulado
      </Button>
    )
  }
  return (
    <Button disabled={pending || disabled} onClick={() => start(() => applyToGig(gigId))} className="px-4">
      {pending ? 'Enviando…' : 'Postularme'}
    </Button>
  )
}
