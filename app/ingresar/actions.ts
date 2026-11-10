'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { FormState } from '@/components/forms'
import { track } from '@/lib/activity'
import { auth } from '@/lib/auth'
import { q, q1 } from '@/lib/db'
import { GENRES, INSTRUMENTS } from '@/lib/domain/types'
import { isSuperadminEmail } from '@/lib/env'
import { slugify } from '@/lib/format'
import { profileRepo } from '@/lib/repositories'
import { isValidEmail, normalizeEmail } from '@/lib/users'

// Login y registro de la superficie PÚBLICA (músicos y bandas). No da acceso a ningún panel interno.

const GENERIC = 'Correo o contraseña incorrectos.'
const str = (fd: FormData, key: string, max = 200) => String(fd.get(key) ?? '').trim().slice(0, max)

function safeNext(value: string) {
  return value.startsWith('/app') && !value.startsWith('//') ? value : '/app'
}

/** Ingreso: solo cuentas con perfil de músico o banda. Ante cualquier fallo, mensaje genérico. */
export async function publicSignIn(_: FormState, fd: FormData): Promise<FormState> {
  const email = normalizeEmail(fd.get('email'))
  const password = String(fd.get('password') ?? '')
  if (!email || !password) return { error: GENERIC }

  const member = await q1(
    `SELECT 1 FROM "user" u JOIN profiles p ON p.user_id = u.id AND p.kind IN ('musician','band') WHERE lower(u.email) = $1`,
    [email],
  )
  if (!member) return { error: GENERIC }
  try {
    await auth.api.signInEmail({ body: { email, password }, headers: await headers() })
  } catch {
    return { error: GENERIC }
  }
  redirect(safeNext(str(fd, 'next', 200)))
}

/** Registro de músico o banda: crea la cuenta (better-auth) y su perfil público. */
export async function publicSignUp(_: FormState, fd: FormData): Promise<FormState> {
  const kind = str(fd, 'kind') === 'band' ? 'band' : 'musician'
  const name = str(fd, 'name', 80)
  const email = normalizeEmail(fd.get('email'))
  const password = String(fd.get('password') ?? '')
  const city = str(fd, 'city', 60)
  const neighborhood = str(fd, 'neighborhood', 60)
  const genres = fd.getAll('genres').map(String).filter((g) => (GENRES as readonly string[]).includes(g)).slice(0, 6)
  const instruments = fd.getAll('instruments').map(String).filter((i) => (INSTRUMENTS as readonly string[]).includes(i)).slice(0, 8)
  const membersRaw = str(fd, 'members', 3)
  const members = kind === 'band' && membersRaw ? Number(membersRaw) : null

  if (name.length < 2) return { error: kind === 'band' ? 'Poné el nombre de la banda.' : 'Decinos tu nombre.' }
  if (!isValidEmail(email)) return { error: 'Ingresá un correo válido.' }
  if (password.length < 8) return { error: 'La contraseña tiene que tener al menos 8 caracteres.' }
  if (city.length < 2) return { error: 'Indicá tu ciudad.' }
  if (!genres.length) return { error: 'Elegí al menos un género.' }
  if (!instruments.length) return { error: kind === 'band' ? 'Elegí los instrumentos de la formación.' : 'Elegí al menos un instrumento.' }
  if (members !== null && (!Number.isInteger(members) || members < 1 || members > 30)) return { error: 'La cantidad de integrantes no es válida.' }
  // Los emails del equipo no pueden registrarse desde acá (además lo bloquea el hook de better-auth).
  if (isSuperadminEmail(email)) return { error: 'No pudimos crear la cuenta. ¿Ya existe ese correo?' }

  let userId: string
  try {
    const result = await auth.api.signUpEmail({ body: { name, email, password }, headers: await headers() })
    userId = result.user.id
  } catch {
    return { error: 'No pudimos crear la cuenta. ¿Ya existe ese correo?' }
  }

  try {
    const handle = await profileRepo.uniqueHandle(slugify(name))
    const row = await q1<{ id: string }>(
      `INSERT INTO profiles (user_id, kind, name, handle, city, neighborhood, genres, instruments, looking_for, members)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [userId, kind, name, handle, city, neighborhood, genres, instruments, kind === 'band' ? ['Fechas'] : ['Banda', 'Fechas'], members],
    )
    await track(row!.id, 'signup')
  } catch (error) {
    console.error('[registro] No se pudo crear el perfil', error)
    await q(`DELETE FROM "user" WHERE id = $1`, [userId]).catch(() => null)
    await auth.api.signOut({ headers: await headers() }).catch(() => null)
    return { error: 'No pudimos crear tu perfil. Probá de nuevo en un momento.' }
  }
  redirect('/app/perfil?bienvenida=1')
}
