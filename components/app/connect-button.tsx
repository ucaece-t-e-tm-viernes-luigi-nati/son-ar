'use client'

import { useTransition } from 'react'
import { Check, UserPlus } from 'lucide-react'
import { requestConnection } from '@/app/app/actions'
import { Button } from '@/components/ui/button'
import type { ConnectionStatus } from '@/lib/domain/types'

export function ConnectButton({
  profileId,
  status,
  size = 'sm',
  disabled = false,
}: {
  profileId: string
  status?: ConnectionStatus
  size?: 'sm' | 'default'
  disabled?: boolean
}) {
  const [pending, start] = useTransition()

  if (status === 'accepted') {
    return (
      <Button variant="secondary" size={size} disabled>
        <Check data-icon="inline-start" /> Conectados
      </Button>
    )
  }
  if (status === 'pending') {
    return (
      <Button variant="outline" size={size} disabled>
        Solicitud enviada
      </Button>
    )
  }
  return (
    <Button size={size} disabled={pending || disabled} onClick={() => start(() => requestConnection(profileId))}>
      <UserPlus data-icon="inline-start" />
      {pending ? 'Enviando…' : 'Conectar'}
    </Button>
  )
}
