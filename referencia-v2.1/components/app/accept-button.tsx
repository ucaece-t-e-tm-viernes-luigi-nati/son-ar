'use client'

import { useTransition } from 'react'
import { acceptConnection } from '@/app/actions/social'
import { Button } from '@/components/ui/button'

export function AcceptButton({ connectionId }: { connectionId: string }) {
  const [pending, start] = useTransition()
  return (
    <Button disabled={pending} onClick={() => start(() => acceptConnection(connectionId))} className="px-4">
      {pending ? 'Aceptando…' : 'Aceptar'}
    </Button>
  )
}
