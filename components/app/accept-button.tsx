'use client'

import { useTransition } from 'react'
import { acceptConnection } from '@/app/app/actions'
import { Button } from '@/components/ui/button'

export function AcceptButton({ connectionId, disabled = false }: { connectionId: string; disabled?: boolean }) {
  const [pending, start] = useTransition()
  return (
    <Button disabled={pending || disabled} onClick={() => start(() => acceptConnection(connectionId))} className="px-4">
      {pending ? 'Aceptando…' : 'Aceptar'}
    </Button>
  )
}
