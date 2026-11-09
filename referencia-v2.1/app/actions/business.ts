'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import { gigRepo } from '@/lib/repositories'
import type { ActionState } from './social'

export async function createGig(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole('business')
  const title = String(formData.get('title') ?? '').trim()
  const date = String(formData.get('date') ?? '')
  const fee = Number(formData.get('fee') ?? 0)
  const description = String(formData.get('description') ?? '').trim()
  const genres = String(formData.get('genres') ?? '')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 5)

  if (title.length < 3 || title.length > 80) return { ok: false, message: 'El título debe tener entre 3 y 80 caracteres.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: 'Elegí una fecha válida.' }
  if (!Number.isInteger(fee) || fee < 0 || fee > 50_000_000) return { ok: false, message: 'Cachet inválido.' }
  if (!genres.length) return { ok: false, message: 'Agregá al menos un género.' }

  await gigRepo.create({ venueId: session.profileId, title, date, fee, description: description.slice(0, 500), genres })
  revalidatePath('/negocios', 'layout')
  revalidatePath('/app/convocatorias')
  return { ok: true, message: 'Convocatoria publicada' }
}

export async function closeGig(gigId: string) {
  const session = await requireRole('business')
  await gigRepo.setStatus(gigId, session.profileId, 'closed')
  revalidatePath('/negocios', 'layout')
  revalidatePath('/app/convocatorias')
}
