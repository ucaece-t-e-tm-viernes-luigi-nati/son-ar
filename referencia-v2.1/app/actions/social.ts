'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import type { PostTag } from '@/lib/domain/types'
import { connectionRepo, gigRepo, postRepo, profileRepo } from '@/lib/repositories'

const TAGS: PostTag[] = ['busqueda', 'show', 'novedad']

export interface ActionState {
  ok: boolean
  message?: string
}

async function requireActiveUser() {
  const session = await getSession('user')
  const profile = await profileRepo.byId(session.profileId)
  if (!profile || profile.status !== 'active') throw new Error('Cuenta pausada')
  return profile
}

export async function createPost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireActiveUser()
  const content = String(formData.get('content') ?? '').trim()
  const tag = String(formData.get('tag') ?? 'novedad') as PostTag
  if (content.length < 3) return { ok: false, message: 'Escribí al menos 3 caracteres.' }
  if (content.length > 500) return { ok: false, message: 'Máximo 500 caracteres.' }
  if (!TAGS.includes(tag)) return { ok: false, message: 'Etiqueta inválida.' }
  await postRepo.create({ authorId: me.id, content, tag })
  revalidatePath('/app')
  return { ok: true, message: 'Publicado' }
}

export async function requestConnection(toId: string) {
  const me = await requireActiveUser()
  const target = await profileRepo.byId(toId)
  if (!target || target.id === me.id || target.status !== 'active') return
  await connectionRepo.request(me.id, toId)
  revalidatePath('/app', 'layout')
}

export async function acceptConnection(connectionId: string) {
  const me = await requireActiveUser()
  await connectionRepo.accept(connectionId, me.id)
  revalidatePath('/app', 'layout')
}

export async function applyToGig(gigId: string) {
  const me = await requireActiveUser()
  await gigRepo.addApplicant(gigId, me.id)
  revalidatePath('/app/convocatorias')
  revalidatePath('/negocios', 'layout')
}
