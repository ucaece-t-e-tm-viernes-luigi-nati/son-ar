'use server'

import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { refresh } from 'next/cache'
import type { FormState } from '@/components/forms'
import { track } from '@/lib/activity'
import { audit } from '@/lib/audit'
import { pool, q1, tx } from '@/lib/db'
import { dayKeyAR, formatDateTime } from '@/lib/dates'
import { GENRES, VENUE_TYPES, type VenueType } from '@/lib/domain/types'
import { appUrl } from '@/lib/env'
import { ACTIVE_CLIENT_COOKIE, getVenueContext, requireVenueWrite } from '@/lib/guards'
import { sendMail } from '@/lib/mail'
import { mails } from '@/lib/mail-templates'
import { gigRepo, profileRepo } from '@/lib/repositories'
import { createCredentialUser, findUserByEmail, generateTempPassword, isValidEmail, normalizeEmail, TEMP_PASSWORD_HOURS } from '@/lib/users'

// Todas las actions resuelven el venue desde la sesión (getVenueContext / requireVenueWrite).
// Nunca se acepta un client_id ni un venue_id que venga del formulario.

const str = (fd: FormData, key: string, max = 500) => String(fd.get(key) ?? '').trim().slice(0, max)

// ---------------- Convocatorias ----------------

export async function createGig(_prev: FormState, formData: FormData): Promise<FormState> {
  const { ctx, error } = await requireVenueWrite('gigs.manage')
  if (error) return { error }
  const venue = await profileRepo.byClientId(ctx.clientId)
  if (!venue) return { error: 'Tu venue todavía no tiene perfil público. Escribinos y lo activamos.' }

  const title = str(formData, 'title', 120)
  const date = str(formData, 'date', 10)
  const fee = Number(str(formData, 'fee', 12) || NaN)
  const description = str(formData, 'description', 500)
  const genres = str(formData, 'genres', 200)
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 5)

  if (title.length < 3 || title.length > 80) return { error: 'El título debe tener entre 3 y 80 caracteres.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Elegí una fecha válida.' }
  if (date < dayKeyAR()) return { error: 'La fecha no puede ser anterior a hoy.' }
  if (!Number.isInteger(fee) || fee < 0 || fee > 50_000_000) return { error: 'Cachet inválido.' }
  if (!genres.length) return { error: 'Agregá al menos un género.' }

  const id = await gigRepo.create({ clientId: ctx.clientId, venueId: venue.id, title, date, fee, description, genres, createdBy: ctx.user.id })
  await track(venue.id, 'gig_created')
  await audit({ id: ctx.user.id, role: ctx.role }, 'gig.create', { clientId: ctx.clientId, entity: 'gig', entityId: id, detail: { date, fee } })
  refresh()
  return { ok: true, message: 'Convocatoria publicada. Ya la ven músicos y bandas.' }
}

export async function closeGig(gigId: string) {
  const { ctx, error } = await requireVenueWrite('gigs.manage')
  if (error || typeof gigId !== 'string') return
  if (await gigRepo.setStatus(gigId, ctx.clientId, 'closed')) {
    await audit({ id: ctx.user.id, role: ctx.role }, 'gig.close', { clientId: ctx.clientId, entity: 'gig', entityId: gigId })
  }
  refresh()
}

// ---------------- Perfil del local ----------------

/** Actualiza la empresa (client) y su perfil público de venue en una transacción. */
export async function updateVenueProfile(_: FormState, fd: FormData): Promise<FormState> {
  const { ctx, error } = await requireVenueWrite('venue.edit')
  if (error) return { error }
  const name = str(fd, 'name', 80)
  const venueType = str(fd, 'venueType') as VenueType
  const city = str(fd, 'city', 60)
  const neighborhood = str(fd, 'neighborhood', 60)
  const capacityRaw = str(fd, 'capacity', 6)
  const capacity = capacityRaw ? Number(capacityRaw) : null
  const description = str(fd, 'description', 500)
  const genres = fd.getAll('genres').map(String).filter((g) => (GENRES as readonly string[]).includes(g)).slice(0, 8)
  if (name.length < 2) return { error: 'El nombre del local es obligatorio.' }
  if (!VENUE_TYPES.includes(venueType)) return { error: 'Elegí un tipo de venue.' }
  if (city.length < 2) return { error: 'Indicá la ciudad.' }
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000)) return { error: 'La capacidad tiene que ser un número entero.' }
  if (!genres.length) return { error: 'Elegí al menos un género que programen.' }

  await tx(async (db) => {
    await db.query(
      `UPDATE client SET name = $2, description = $3, venue_type = $4, city = $5, neighborhood = $6, address = $7, capacity = $8,
              instagram = $9, website = $10, phone = $11, data = data || jsonb_build_object('genres', $12::text[]), updated_at = now()
        WHERE id = $1`,
      [ctx.clientId, name, description || null, venueType, city, neighborhood || null, str(fd, 'address', 120) || null, capacity,
        str(fd, 'instagram', 60) || null, str(fd, 'website', 200) || null, str(fd, 'phone', 40) || null, genres],
    )
    await db.query(
      `UPDATE profiles SET name = $2, bio = $3, venue_type = $4, city = $5, neighborhood = $6, capacity = $7, genres = $8
        WHERE client_id = $1 AND kind = 'venue'`,
      [ctx.clientId, name, description, venueType, city, neighborhood, capacity, genres],
    )
  })
  await audit({ id: ctx.user.id, role: ctx.role }, 'client.profile_update', { clientId: ctx.clientId, entity: 'client', entityId: ctx.clientId })
  refresh()
  return { ok: true, message: 'Guardamos los datos del local. El perfil público ya está actualizado.' }
}

// ---------------- Equipo ----------------

export async function inviteMember(_: FormState, fd: FormData): Promise<FormState> {
  const { ctx, error } = await requireVenueWrite('team.manage')
  if (error) return { error }
  const email = normalizeEmail(fd.get('email'))
  const name = str(fd, 'name', 80) || email.split('@')[0]
  const role = str(fd, 'role') === 'owner' ? 'owner' : 'staff'
  if (!isValidEmail(email)) return { error: 'Ingresá un correo válido.' }

  const existing = await findUserByEmail(email)
  if (existing) {
    if (existing.role === 'superadmin') return { error: 'Ese correo no se puede sumar al equipo.' }
    const already = await q1(`SELECT 1 FROM client_member WHERE client_id = $1 AND user_id = $2`, [ctx.clientId, existing.id])
    if (already) return { error: 'Esa persona ya forma parte del equipo.' }
  }

  const password = existing ? null : generateTempPassword()
  const userId = await tx(async (db) => {
    let id = existing?.id
    if (!id && password) {
      id = await createCredentialUser(db, { email, name, password, temporary: true, emailVerified: true })
    }
    if (!id) throw new Error('usuario inexistente')
    await db.query(`INSERT INTO client_member (client_id, user_id, role) VALUES ($1, $2, $3)`, [ctx.clientId, id, role])
    return id
  })

  const venceClave = formatDateTime(new Date(Date.now() + TEMP_PASSWORD_HOURS * 3600 * 1000))
  await sendMail({
    to: email,
    ...mails.staffAccess({ empresa: ctx.clientName, link: `${appUrl()}/empresa/ingresar`, email, password, venceClave, nuevo: true }),
    secrets: password ? [password] : [],
  })
  await audit({ id: ctx.user.id, role: ctx.role }, 'member.add', { clientId: ctx.clientId, entity: 'user', entityId: userId, detail: { role, newUser: !existing } })
  refresh()
  return { ok: true, message: `Le enviamos un mail a ${email} con el acceso.` }
}

export async function removeMember(userId: string) {
  const { ctx, error } = await requireVenueWrite('team.manage')
  if (error || typeof userId !== 'string') return
  if (userId === ctx.user.id) return // no se puede quitar a sí mismo
  const owners = await q1<{ n: number }>(`SELECT count(*)::int AS n FROM client_member WHERE client_id = $1 AND role = 'owner' AND user_id <> $2`, [ctx.clientId, userId])
  if (!owners?.n) return // siempre queda al menos un propietario
  await pool.query(`DELETE FROM client_member WHERE client_id = $1 AND user_id = $2`, [ctx.clientId, userId])
  await audit({ id: ctx.user.id, role: ctx.role }, 'member.remove', { clientId: ctx.clientId, entity: 'user', entityId: userId })
  refresh()
}

/** Cambia el venue activo (si el usuario pertenece a más de uno). Se valida contra sus membresías. */
export async function switchClient(fd: FormData) {
  const ctx = await getVenueContext()
  const target = String(fd.get('clientId') ?? '')
  if (!ctx.memberships.some((m) => m.clientId === target)) notFound()
  ;(await cookies()).set(ACTIVE_CLIENT_COOKIE, target, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/empresa' })
  redirect('/empresa')
}
