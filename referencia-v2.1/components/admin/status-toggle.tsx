'use client'

import { useTransition } from 'react'
import { setAccountStatus } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import type { AccountStatus } from '@/lib/domain/types'

export function StatusToggle({ profileId, status, name }: { profileId: string; status: AccountStatus; name: string }) {
  const [pending, start] = useTransition()
  const next: AccountStatus = status === 'active' ? 'paused' : 'active'
  return (
    <Button
      size="sm"
      variant={status === 'active' ? 'outline' : 'default'}
      disabled={pending}
      aria-label={`${status === 'active' ? 'Pausar' : 'Activar'} cuenta de ${name}`}
      onClick={() => start(() => setAccountStatus(profileId, next))}
    >
      {pending ? '…' : status === 'active' ? 'Pausar' : 'Activar'}
    </Button>
  )
}
