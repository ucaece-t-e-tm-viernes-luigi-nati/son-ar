'use server'

import { redirect } from 'next/navigation'
import { refresh } from 'next/cache'
import type { FormState } from '@/components/forms'
import { audit } from '@/lib/audit'
import { q, q1, tx } from '@/lib/db'
import { addDays, dayKeyAR, formatDate, formatDateTime, formatMoney, nextDueAfter } from '@/lib/dates'
import type { AccountStatus } from '@/lib/domain/types'
import { appUrl, isSuperadminEmail } from '@/lib/env'
import { requireSuperadmin } from '@/lib/guards'
import { sendMail } from '@/lib/mail'
import { mails } from '@/lib/mail-templates'
import type { Application } from '@/lib/onboarding'
import { profileRepo } from '@/lib/repositories'
import { STATUS_LABELS } from '@/components/panel/ui'
import { createCredentialUser, findUserByEmail, generateTempPassword, isValidEmail, normalizeEmail, randomToken, setUserPassword, TEMP_PASSWORD_HOURS } from '@/lib/users'

// Cada action vuelve a verificar que quien llama es superadmin (requireSuperadmin → 404 si no).

const str = (fd: FormData, key: string, max = 500) => String(fd.get(key) ?? '').trim().slice(0, max)
const actor = (u: { id: string }) => ({ id: u.id, role: 'superadmin' })
const MEDIOS_PAGO = 'transferencia bancaria o efectivo (te pasamos los datos por este medio)'

function parseCents(value: string) {
  const n = Number(value.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null
}

function slugify(text: string) {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'venue'
  )
}

// ---------------- Solicitudes ----------------

/**
 * Aprobar: crea client + owner con contraseña temporal + perfil público kind=venue (para que aparezca en Explorar y en sus
 * convocatorias), fija plan, precio, fin de prueba y día de pago. Todo en una transacción.
 */
export async function approveApplication(applicationId: string, _: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireSuperadmin()
  const planId = str(fd, 'plan_id', 40)
  const priceCents = parseCents(str(fd, 'price', 12))
  const trialDays = Number(str(fd, 'trial_days', 3))
  const billingDay = Number(str(fd, 'billing_day', 2))
  if (priceCents === null) return { error: 'Precio inválido.' }
  if (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > 365) return { error: 'Días de prueba inválidos.' }
  if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 28) return { error: 'El día de pago tiene que ser entre 1 y 28.' }
  const plan = await q1<{ id: string; name: string; currency: string }>(`SELECT id, name, currency FROM plan WHERE id = $1`, [planId])
  if (!plan) return { error: 'Elegí un plan.' }

  const today = dayKeyAR()
  const trialEnds = trialDays > 0 ? addDays(today, trialDays) : null
  const nextDue = trialEnds ?? today
  let password: string | null = null
  let app: Application | null = null
  let clientName = ''

  try {
    await tx(async (db) => {
      const { rows } = await db.query<Application>(`SELECT * FROM client_application WHERE id = $1 AND status = 'pending_review' FOR UPDATE`, [applicationId])
      app = rows[0] ?? null
      if (!app) throw new Error('not_pending')
      const d = app.data ?? {}
      clientName = d.name ?? app.contact_name ?? 'Venue'
      if (isSuperadminEmail(app.email)) throw new Error('reserved_email')

      let slug = slugify(clientName)
      const taken = await db.query(`SELECT slug FROM client WHERE slug = $1 OR slug LIKE $1 || '-%'`, [slug])
      if (taken.rowCount) slug = `${slug}-${taken.rowCount + 1}`

      const client = await db.query<{ id: string }>(
        `INSERT INTO client (slug, name, legal_name, tax_id, city, neighborhood, address, venue_type, capacity, instagram, website, phone,
                             contact_email, data, plan_id, monthly_price_cents, currency, status, trial_ends_at, billing_day, next_due_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,$18,$19::date,$20,$21::date) RETURNING id`,
        [
          slug, clientName, d.legal_name || null, d.tax_id || null, d.city || 'Mar del Plata', d.neighborhood || null, d.address || null,
          d.venue_type || null, d.capacity ?? null, d.instagram || null, d.website || null, app.phone, app.email,
          JSON.stringify({ genres: d.genres ?? [] }), plan.id, priceCents, plan.currency, trialEnds ? 'trial' : 'active',
          trialEnds, billingDay, nextDue,
        ],
      )
      const clientId = client.rows[0].id

      const existing = await findUserByEmail(app.email, db)
      let userId = existing?.id
      if (!userId) {
        password = generateTempPassword()
        userId = await createCredentialUser(db, { email: app.email, name: app.contact_name ?? clientName, password, temporary: true, emailVerified: true })
      }
      await db.query(`INSERT INTO client_member (client_id, user_id, role) VALUES ($1, $2, 'owner') ON CONFLICT DO NOTHING`, [clientId, userId])
      // Perfil público del venue (kind=venue): aparece en Explorar y firma sus convocatorias.
      const handle = await profileRepo.uniqueHandle(slug, db)
      await db.query(
        `INSERT INTO profiles (client_id, kind, name, handle, city, neighborhood, genres, looking_for, bio, capacity, venue_type)
         VALUES ($1, 'venue', $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (client_id) DO NOTHING`,
        [clientId, clientName, handle, d.city || 'Mar del Plata', d.neighborhood ?? '', d.genres ?? [], ['Bandas', 'Solistas'], d.description ?? '', d.capacity ?? null, d.venue_type ?? null],
      )
      await db.query(
        `UPDATE client_application SET status = 'approved', reviewed_by = $2, reviewed_at = now(), review_reason = NULL, client_id = $3, updated_at = now() WHERE id = $1`,
        [applicationId, admin.id, clientId],
      )
      await db.query(
        `INSERT INTO audit_log (actor_user_id, actor_role, client_id, action, entity, entity_id, detail) VALUES ($1, 'superadmin', $2, 'application.approve', 'client_application', $3, $4)`,
        [admin.id, clientId, applicationId, JSON.stringify({ plan: plan.id, priceCents, trialDays, billingDay, newUser: !existing })],
      )
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'not_pending') return { error: 'La solicitud ya no está pendiente.' }
    if (error instanceof Error && error.message === 'reserved_email') return { error: 'El email de la solicitud pertenece al equipo: no se puede usar para un venue.' }
    throw error
  }

  const a = app as Application | null
  if (a) {
    await sendMail({
      to: a.email,
      ...mails.approved({
        nombre: a.contact_name ?? '',
        empresa: clientName,
        link: `${appUrl()}/empresa/ingresar`,
        email: a.email,
        password,
        venceClave: formatDateTime(new Date(Date.now() + TEMP_PASSWORD_HOURS * 3600 * 1000)),
        plan: plan.name,
        monto: priceCents > 0 ? formatMoney(priceCents, plan.currency) : null,
        finPrueba: trialEnds ? formatDate(trialEnds) : null,
        diaPago: billingDay,
        mediosPago: MEDIOS_PAGO,
      }),
      secrets: password ? [password] : [],
    })
  }
  redirect(`/plataforma/solicitudes/${applicationId}`)
}

/** Rechazo con motivo: "puede corregir" (changes_requested, mail con link) o "definitivo" (rejected). */
export async function reviewApplication(applicationId: string, _: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireSuperadmin()
  const reason = str(fd, 'reason', 2000)
  const mode = str(fd, 'mode') === 'reject' ? 'rejected' : 'changes_requested'
  if (reason.length < 5) return { error: 'Escribí el motivo (es obligatorio y le llega al venue).' }

  const app = await q1<Application & { kind: string }>(
    `UPDATE client_application a SET status = $2, review_reason = $3, reviewed_by = $4, reviewed_at = now(), updated_at = now()
       FROM client_invite i
      WHERE a.id = $1 AND a.status = 'pending_review' AND i.token = a.invite_token
      RETURNING a.*, i.kind`,
    [applicationId, mode, reason, admin.id],
  )
  if (!app) return { error: 'La solicitud ya no está pendiente.' }
  const empresa = app.data?.name ?? app.contact_name ?? 'tu venue'
  if (mode === 'changes_requested') {
    const link = `${appUrl()}/empresa/alta/${app.invite_token}?corregir=1${app.kind === 'campaign' ? `&clave=${app.resume_key}` : ''}`
    await sendMail({ to: app.email, ...mails.changesRequested({ nombre: app.contact_name ?? '', empresa, motivo: reason, link }) })
  } else {
    await sendMail({ to: app.email, ...mails.rejected({ nombre: app.contact_name ?? '', empresa, motivo: reason }) })
  }
  await audit(actor(admin), mode === 'rejected' ? 'application.reject' : 'application.request_changes', { entity: 'client_application', entityId: applicationId, detail: { reason } })
  redirect(`/plataforma/solicitudes/${applicationId}`)
}

// ---------------- Empresas (venues) ----------------

const ALLOWED_STATUS = ['trial', 'active', 'past_due', 'paused', 'cancelled']

export async function setClientStatus(clientId: string, status: string) {
  const admin = await requireSuperadmin()
  if (!ALLOWED_STATUS.includes(status)) return
  const row = await q1<{ name: string; prev: string; emails: string[] | null }>(
    `WITH prev AS (SELECT status FROM client WHERE id = $1)
     UPDATE client SET status = $2, updated_at = now() WHERE id = $1
     RETURNING name, (SELECT status FROM prev) AS prev,
       (SELECT array_agg(u.email) FROM client_member m JOIN "user" u ON u.id = m.user_id WHERE m.client_id = $1 AND m.role = 'owner') AS emails`,
    [clientId, status],
  )
  if (!row) return
  await audit(actor(admin), `client.status.${status}`, { clientId, entity: 'client', entityId: clientId, detail: { from: row.prev, to: status } })
  if (row.prev !== status) {
    for (const to of row.emails ?? []) await sendMail({ to, ...mails.statusChanged({ empresa: row.name, estado: STATUS_LABELS[status] ?? status }) })
  }
  refresh()
}

export async function updateClientPlan(clientId: string, _: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireSuperadmin()
  const planId = str(fd, 'plan_id', 40)
  const priceCents = parseCents(str(fd, 'price', 12))
  const billingDay = Number(str(fd, 'billing_day', 2))
  const nextDue = str(fd, 'next_due_date', 10)
  if (priceCents === null) return { error: 'Precio inválido.' }
  if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 28) return { error: 'El día de pago tiene que ser entre 1 y 28.' }
  if (nextDue && !/^\d{4}-\d{2}-\d{2}$/.test(nextDue)) return { error: 'Fecha de vencimiento inválida.' }
  const plan = await q1<{ currency: string }>(`SELECT currency FROM plan WHERE id = $1`, [planId])
  if (!plan) return { error: 'Elegí un plan.' }
  await q(
    `UPDATE client SET plan_id = $2, monthly_price_cents = $3, currency = $4, billing_day = $5,
            next_due_date = coalesce($6::date, next_due_date), updated_at = now() WHERE id = $1`,
    [clientId, planId, priceCents, plan.currency, billingDay, nextDue || null],
  )
  await audit(actor(admin), 'client.plan_change', { clientId, entity: 'client', entityId: clientId, detail: { planId, priceCents, billingDay, nextDue } })
  refresh()
  return { ok: true, message: 'Plan actualizado.' }
}

/** Pago manual: registra el pago, corre el vencimiento al mes siguiente y reactiva la cuenta si estaba vencida o pausada. */
export async function registerPayment(clientId: string, _: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireSuperadmin()
  const amountCents = parseCents(str(fd, 'amount', 12))
  const method = str(fd, 'method', 40) || 'transferencia'
  const notes = str(fd, 'notes', 300) || null
  if (!amountCents) return { error: 'Indicá el monto pagado.' }

  const c = await q1<{ name: string; currency: string; status: string; billing_day: number | null; next_due_date: string | null; emails: string[] | null }>(
    `SELECT name, currency, status, billing_day, to_char(next_due_date, 'YYYY-MM-DD') AS next_due_date,
            (SELECT array_agg(u.email) FROM client_member m JOIN "user" u ON u.id = m.user_id WHERE m.client_id = c.id AND m.role = 'owner') AS emails
       FROM client c WHERE id = $1`,
    [clientId],
  )
  if (!c) return { error: 'Venue inexistente.' }
  const due = c.next_due_date ?? dayKeyAR()
  const period = due.slice(0, 7)
  const nextDue = nextDueAfter(due, c.billing_day ?? Number(due.slice(8, 10)))
  const newStatus = ['trial', 'past_due', 'paused'].includes(c.status) ? 'active' : c.status

  await tx(async (db) => {
    await db.query(
      `INSERT INTO payment (client_id, period, amount_cents, currency, status, method, due_date, paid_at, notes, registered_by)
       VALUES ($1, $2, $3, $4, 'paid', $5, $6::date, now(), $7, $8)
       ON CONFLICT (client_id, period) DO UPDATE SET status = 'paid', amount_cents = $3, method = $5, paid_at = now(), notes = $7, registered_by = $8`,
      [clientId, period, amountCents, c.currency, method, due, notes, admin.id],
    )
    await db.query(`UPDATE client SET next_due_date = $2::date, status = $3, updated_at = now() WHERE id = $1`, [clientId, nextDue, newStatus])
  })
  await audit(actor(admin), 'payment.register', { clientId, entity: 'payment', entityId: period, detail: { amountCents, method, nextDue, from: c.status, to: newStatus } })
  for (const to of c.emails ?? []) {
    await sendMail({ to, ...mails.paymentRegistered({ empresa: c.name, monto: formatMoney(amountCents, c.currency), periodo: period, proximo: formatDate(nextDue) }) })
  }
  refresh()
  return { ok: true, message: `Pago registrado. Próximo vencimiento: ${formatDate(nextDue)}.` }
}

/** Genera una nueva contraseña temporal para un miembro (p. ej. si la anterior venció) y se la manda por mail. */
export async function resendAccess(clientId: string, userId: string) {
  const admin = await requireSuperadmin()
  const row = await q1<{ email: string; name: string }>(
    `SELECT u.email, c.name FROM client_member m JOIN "user" u ON u.id = m.user_id JOIN client c ON c.id = m.client_id WHERE m.client_id = $1 AND m.user_id = $2`,
    [clientId, userId],
  )
  if (!row) return
  const password = generateTempPassword()
  await tx((db) => setUserPassword(db, userId, password, { temporary: true }))
  await sendMail({
    to: row.email,
    ...mails.staffAccess({ empresa: row.name, link: `${appUrl()}/empresa/ingresar`, email: row.email, password, venceClave: formatDateTime(new Date(Date.now() + TEMP_PASSWORD_HOURS * 3600 * 1000)), nuevo: false }),
    secrets: [password],
  })
  await audit(actor(admin), 'member.reset_access', { clientId, entity: 'user', entityId: userId })
  refresh()
}

// ---------------- Invitaciones ----------------

export async function createInvite(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireSuperadmin()
  const kind = str(fd, 'kind') === 'campaign' ? 'campaign' : 'personal'
  const token = randomToken(24)

  if (kind === 'personal') {
    const email = normalizeEmail(fd.get('email'))
    const name = str(fd, 'name', 80) || null
    if (!isValidEmail(email)) return { error: 'Ingresá un correo válido.' }
    await q(`INSERT INTO client_invite (token, kind, email, label, expires_at, created_by) VALUES ($1, 'personal', $2, $3, now() + interval '14 days', $4)`, [token, email, name, admin.id])
    const link = `${appUrl()}/empresa/alta/${token}`
    if (fd.get('send') === 'on') {
      await sendMail({ to: email, ...mails.invite({ link, expires: formatDate(addDays(dayKeyAR(), 14)), name }) })
    }
    await audit(actor(admin), 'invite.create', { entity: 'client_invite', detail: { kind, email, sent: fd.get('send') === 'on' } })
    refresh()
    return { ok: true, message: fd.get('send') === 'on' ? `Invitación enviada a ${email}.` : 'Invitación creada. Copiá el link de la tabla.' }
  }

  const label = str(fd, 'label', 80) || 'Campaña'
  const days = Number(str(fd, 'days', 3) || 30)
  const maxUsesRaw = str(fd, 'max_uses', 5)
  const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null
  if (!Number.isInteger(days) || days < 1 || days > 365) return { error: 'La vigencia tiene que ser entre 1 y 365 días.' }
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) return { error: 'El cupo tiene que ser un número positivo.' }
  await q(
    `INSERT INTO client_invite (token, kind, label, max_uses, expires_at, created_by) VALUES ($1, 'campaign', $2, $3, now() + make_interval(days => $4::int), $5)`,
    [token, label, maxUses, days, admin.id],
  )
  await audit(actor(admin), 'invite.create', { entity: 'client_invite', detail: { kind, label, days, maxUses } })
  refresh()
  return { ok: true, message: 'Link de campaña creado. Copialo de la tabla y compartilo por mail o WhatsApp.' }
}

export async function revokeInvite(token: string) {
  const admin = await requireSuperadmin()
  await q(`UPDATE client_invite SET revoked_at = now() WHERE token = $1 AND revoked_at IS NULL`, [token])
  await audit(actor(admin), 'invite.revoke', { entity: 'client_invite', detail: { token: `${token.slice(0, 6)}…` } })
  refresh()
}

export async function resendInvite(token: string) {
  const admin = await requireSuperadmin()
  const invite = await q1<{ email: string | null; label: string | null; expires_at: Date }>(
    `SELECT email, label, expires_at FROM client_invite WHERE token = $1 AND kind = 'personal' AND revoked_at IS NULL AND expires_at > now() AND uses = 0`,
    [token],
  )
  if (!invite?.email) return
  await sendMail({ to: invite.email, ...mails.invite({ link: `${appUrl()}/empresa/alta/${token}`, expires: formatDate(invite.expires_at), name: invite.label }) })
  await audit(actor(admin), 'invite.resend', { entity: 'client_invite', detail: { email: invite.email } })
  refresh()
}

// ---------------- Planes ----------------

export async function savePlan(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireSuperadmin()
  const id = slugify(str(fd, 'id', 40))
  const name = str(fd, 'name', 40)
  const priceCents = parseCents(str(fd, 'price', 12))
  const trialDays = Number(str(fd, 'trial_days', 3))
  const sort = Number(str(fd, 'sort', 3) || 0)
  const features = str(fd, 'features', 1000)
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean)
  if (!id || !name) return { error: 'El plan necesita id y nombre.' }
  if (priceCents === null) return { error: 'Precio inválido.' }
  if (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > 365) return { error: 'Días de prueba inválidos.' }
  await q(
    `INSERT INTO plan (id, name, description, features, monthly_price_cents, currency, trial_days, sort, active)
     VALUES ($1, $2, $3, $4::jsonb, $5, 'ARS', $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET name = $2, description = $3, features = $4::jsonb, monthly_price_cents = $5, trial_days = $6, sort = $7, active = $8`,
    [id, name, str(fd, 'description', 200) || null, JSON.stringify(features), priceCents, trialDays, Number.isFinite(sort) ? sort : 0, fd.get('active') === 'on'],
  )
  await audit(actor(admin), 'plan.save', { entity: 'plan', entityId: id, detail: { priceCents, trialDays, active: fd.get('active') === 'on' } })
  refresh()
  return { ok: true, message: `Plan "${name}" guardado. Los venues existentes mantienen su precio actual.` }
}

// ---------------- Cuentas de músicos y bandas ----------------

/** Pausar / activar una cuenta de músico o banda (queda en audit_log). Una cuenta pausada no aparece en la red ni puede escribir. */
export async function setAccountStatus(profileId: string, status: AccountStatus) {
  const admin = await requireSuperadmin()
  if (typeof profileId !== 'string' || (status !== 'active' && status !== 'paused')) return
  const row = await profileRepo.setStatus(profileId, status)
  if (!row) return
  await audit(actor(admin), status === 'paused' ? 'profile.pause' : 'profile.activate', {
    entity: 'profile',
    entityId: profileId,
    detail: { name: row.name, from: row.prev, to: status },
  })
  refresh()
}
