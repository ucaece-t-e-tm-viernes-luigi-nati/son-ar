'use server'

import { refresh } from 'next/cache'
import type { FormState } from '@/components/forms'
import { track } from '@/lib/activity'
import { q } from '@/lib/db'
import { GENRES, INSTRUMENTS, LOOKING_FOR, type PostTag } from '@/lib/domain/types'
import { requireMemberPermission } from '@/lib/guards'
import { connectionRepo, gigRepo, postRepo, profileRepo } from '@/lib/repositories'

// Acciones de músicos y bandas. El perfil SIEMPRE sale de la sesión (requireMemberPermission), nunca del formulario.

const TAGS: PostTag[] = ['busqueda', 'show', 'novedad']
const str = (fd: FormData, key: string, max = 500) => String(fd.get(key) ?? '').trim().slice(0, max)

export async function createPost(_prev: FormState, formData: FormData): Promise<FormState> {
  const { ctx, error } = await requireMemberPermission('post.create')
  if (!ctx) return { ok: false, message: error ?? undefined }
  const content = str(formData, 'content', 600)
  const tag = str(formData, 'tag') as PostTag
  if (content.length < 3) return { ok: false, message: 'Escribí al menos 3 caracteres.' }
  if (content.length > 500) return { ok: false, message: 'Máximo 500 caracteres.' }
  if (!TAGS.includes(tag)) return { ok: false, message: 'Etiqueta inválida.' }
  await postRepo.create({ authorId: ctx.profile.id, content, tag })
  await track(ctx.profile.id, 'post')
  refresh()
  return { ok: true, message: 'Publicado' }
}

export async function requestConnection(toId: string) {
  const { ctx } = await requireMemberPermission('connection.request')
  if (!ctx || typeof toId !== 'string' || toId === ctx.profile.id) return
  const target = await profileRepo.byId(toId)
  // Las conexiones son entre músicos y bandas visibles (a los venues se llega por sus convocatorias).
  if (!target || target.kind === 'venue' || !(await profileRepo.isVisible(toId))) return
  if (await connectionRepo.request(ctx.profile.id, toId)) await track(ctx.profile.id, 'connection')
  refresh()
}

export async function acceptConnection(connectionId: string) {
  const { ctx } = await requireMemberPermission('connection.accept')
  if (!ctx || typeof connectionId !== 'string') return
  if (await connectionRepo.accept(connectionId, ctx.profile.id)) await track(ctx.profile.id, 'connection_accepted')
  refresh()
}

export async function applyToGig(gigId: string) {
  const { ctx } = await requireMemberPermission('gig.apply')
  if (!ctx || typeof gigId !== 'string') return
  if (await gigRepo.addApplicant(gigId, ctx.profile.id)) await track(ctx.profile.id, 'gig_application')
  refresh()
}

/** Edición del propio perfil (los campos que se completaron en el registro). */
export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const { ctx, error } = await requireMemberPermission('profile.edit')
  if (!ctx) return { error: error ?? 'No autorizado.' }
  const name = str(fd, 'name', 80)
  const city = str(fd, 'city', 60)
  const neighborhood = str(fd, 'neighborhood', 60)
  const bio = str(fd, 'bio', 500)
  const genres = fd.getAll('genres').map(String).filter((g) => (GENRES as readonly string[]).includes(g)).slice(0, 6)
  const instruments = fd.getAll('instruments').map(String).filter((i) => (INSTRUMENTS as readonly string[]).includes(i)).slice(0, 8)
  const lookingFor = fd.getAll('lookingFor').map(String).filter((l) => (LOOKING_FOR as readonly string[]).includes(l)).slice(0, 6)
  const membersRaw = str(fd, 'members', 3)
  const members = ctx.profile.kind === 'band' && membersRaw ? Number(membersRaw) : null
  if (name.length < 2) return { error: 'El nombre es obligatorio.' }
  if (city.length < 2) return { error: 'Indicá tu ciudad.' }
  if (!genres.length) return { error: 'Elegí al menos un género.' }
  if (!instruments.length) return { error: 'Elegí al menos un instrumento.' }
  if (members !== null && (!Number.isInteger(members) || members < 1 || members > 30)) return { error: 'La cantidad de integrantes no es válida.' }

  await q(
    `UPDATE profiles SET name = $2, city = $3, neighborhood = $4, bio = $5, genres = $6, instruments = $7, looking_for = $8, members = $9
      WHERE id = $1 AND user_id = $10`,
    [ctx.profile.id, name, city, neighborhood, bio, genres, instruments, lookingFor, members, ctx.user.id],
  )
  refresh()
  return { ok: true, message: 'Guardamos tu perfil.' }
}
