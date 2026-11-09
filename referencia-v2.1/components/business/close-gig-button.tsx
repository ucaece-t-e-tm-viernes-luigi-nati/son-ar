'use client'

import { useTransition } from 'react'
import { closeGig } from '@/app/actions/business'
import { Button } from '@/components/ui/button'

export function CloseGigButton({ gigId }: { gigId: string }) {
  const [pending, start] = useTransition()
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => closeGig(gigId))}>
      {pending ? 'Cerrando…' : 'Cerrar convocatoria'}
    </Button>
  )
}
