'use client'

import { useTransition } from 'react'
import { Check } from 'lucide-react'
import { applyToGig } from '@/app/actions/social'
import { Button } from '@/components/ui/button'

export function ApplyButton({ gigId, applied }: { gigId: string; applied: boolean }) {
  const [pending, start] = useTransition()
  if (applied) {
    return (
      <Button variant="secondary" disabled>
        <Check data-icon="inline-start" /> Postulado
      </Button>
    )
  }
  return (
    <Button disabled={pending} onClick={() => start(() => applyToGig(gigId))} className="px-4">
      {pending ? 'Enviando…' : 'Postularme'}
    </Button>
  )
}
