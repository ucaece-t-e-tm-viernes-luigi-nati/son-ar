'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import type { AccountStatus } from '@/lib/domain/types'
import { profileRepo } from '@/lib/repositories'

export async function setAccountStatus(profileId: string, status: AccountStatus) {
  await requireRole('superadmin')
  if (status !== 'active' && status !== 'paused') throw new Error('Estado inválido')
  await profileRepo.setStatus(profileId, status)
  revalidatePath('/', 'layout')
}
