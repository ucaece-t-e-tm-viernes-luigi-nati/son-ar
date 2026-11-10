import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActionForm, inputClass, labelClass } from '@/components/forms'
import { Card, Empty, Metric, PageTitle, STATUS_LABELS, StatusBadge, Table, Td } from '@/components/panel/ui'
import { getVenueProfile, listVenueMembers, listVenuePayments } from '@/lib/data/venue'
import { q, q1 } from '@/lib/db'
import { formatDate, formatDateTime, formatMoney } from '@/lib/dates'
import { requireSuperadmin } from '@/lib/guards'
import { listActivePlans } from '@/lib/onboarding'
import { registerPayment, resendAccess, setClientStatus, updateClientPlan } from '../../actions'

export const metadata: Metadata = { title: 'Venue' }

export default async function ClientDetailPage({ params }: PageProps<'/plataforma/empresas/[id]'>) {
  await requireSuperadmin()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const c = await getVenueProfile(id)
  if (!c) notFound()
  const [members, payments, plans, stats, events] = await Promise.all([
    listVenueMembers(id),
    listVenuePayments(id),
    listActivePlans(),
    q1<{ events: number; published: number; interested: number; profile: string | null; handle: string | null }>(
      `SELECT count(*)::int AS events, count(*) FILTER (WHERE status = 'open')::int AS published,
              (SELECT count(*)::int FROM gig_applications a JOIN gigs g2 ON g2.id = a.gig_id WHERE g2.client_id = $1) AS interested,
              (SELECT status FROM profiles WHERE client_id = $1) AS profile,
              (SELECT handle FROM profiles WHERE client_id = $1) AS handle
         FROM gigs WHERE client_id = $1`,
      [id],
    ),
    q<{ id: string; title: string; status: string; starts_at: string }>(`SELECT id, title, status, to_char(date, 'YYYY-MM-DD') AS starts_at FROM gigs WHERE client_id = $1 ORDER BY date DESC LIMIT 10`, [id]),
  ])
  const statusActions = ['active', 'paused', 'cancelled'].filter((s) => s !== c.status)

  return (
    <>
      <Link href="/plataforma/empresas" className="text-xs font-semibold text-muted-foreground hover:text-primary">
        ← Venues
      </Link>
      <PageTitle
        title={c.name}
        description={
          <>
            <StatusBadge status={c.status} /> · {c.venue_type ?? '—'} · {c.neighborhood ?? '—'}, {c.city ?? '—'} · {c.address ?? '—'}
            {stats?.handle ? ` · perfil público @${stats.handle}` : ' · sin perfil público'}
            {c.is_demo ? ' · demo' : ''}
          </>
        }
        actions={statusActions.map((s) => (
          <form key={s} action={setClientStatus.bind(null, c.id, s)}>
            <button className={`rounded-xl border px-4 py-2 text-sm font-semibold ${s === 'active' ? 'border-primary text-primary' : 'border-border'} hover:bg-muted`}>
              {s === 'active' ? 'Activar' : s === 'paused' ? 'Pausar' : 'Dar de baja'}
            </button>
          </form>
        ))}
      />
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Abono" value={formatMoney(c.monthly_price_cents, c.currency)} hint={c.plan_name ?? undefined} />
        <Metric label="Próximo vencimiento" value={formatDate(c.next_due_date)} hint={c.billing_day ? `Día de pago: ${c.billing_day}` : undefined} />
        <Metric label="Convocatorias (abiertas)" value={`${stats?.events ?? 0} (${stats?.published ?? 0})`} />
        <Metric label="Postulaciones recibidas" value={stats?.interested ?? 0} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Registrar pago" description={`Se imputa al vencimiento del ${formatDate(c.next_due_date)} y corre el próximo al mes siguiente.`}>
          <ActionForm action={registerPayment.bind(null, c.id)} submitLabel="Registrar pago" resetOnSuccess>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Monto ({c.currency})
                <input name="amount" inputMode="decimal" required defaultValue={String(Number(c.monthly_price_cents) / 100)} className={inputClass} />
              </label>
              <label className={labelClass}>
                Medio
                <select name="method" className={inputClass}>
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="mercadopago">Mercado Pago</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
            </div>
            <label className={labelClass}>
              Notas / comprobante
              <input name="notes" maxLength={300} className={inputClass} />
            </label>
          </ActionForm>
        </Card>

        <Card title="Plan y facturación">
          <ActionForm action={updateClientPlan.bind(null, c.id)} submitLabel="Guardar plan">
            <label className={labelClass}>
              Plan
              <select name="plan_id" defaultValue={c.plan_id ?? ''} className={inputClass}>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className={labelClass}>
                Abono ARS
                <input name="price" inputMode="decimal" required defaultValue={String(Number(c.monthly_price_cents) / 100)} className={inputClass} />
              </label>
              <label className={labelClass}>
                Día de pago
                <input name="billing_day" type="number" min={1} max={28} required defaultValue={c.billing_day ?? 10} className={inputClass} />
              </label>
              <label className={labelClass}>
                Próx. venc.
                <input name="next_due_date" type="date" defaultValue={c.next_due_date ?? ''} className={inputClass} />
              </label>
            </div>
          </ActionForm>
        </Card>

        <Card title="Equipo del venue">
          {members.length ? (
            <ul className="flex flex-col gap-3 text-sm">
              {members.map((m) => (
                <li key={m.userId} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {m.name} <span className="text-xs font-normal text-muted-foreground">({m.role === 'owner' ? 'propietario' : 'staff'})</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.email}
                      {m.mustChangePassword && ' · con contraseña temporal'}
                    </p>
                  </div>
                  <form action={resendAccess.bind(null, c.id, m.userId)}>
                    <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Reenviar acceso</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Sin usuarios (venue de demo).</Empty>
          )}
        </Card>

        <Card title="Pagos">
          {payments.length ? (
            <Table head={['Período', 'Monto', 'Estado', 'Pagado']}>
              {payments.map((p) => (
                <tr key={p.id}>
                  <Td>{p.period}</Td>
                  <Td>{formatMoney(p.amount_cents, p.currency)}</Td>
                  <Td>
                    <StatusBadge status={p.status} />
                  </Td>
                  <Td className="text-xs">{p.paid_at ? `${formatDateTime(p.paid_at)} · ${p.method ?? ''}` : '—'}</Td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty>Sin pagos registrados.</Empty>
          )}
        </Card>

        <Card title="Últimas convocatorias" className="lg:col-span-2">
          {events.length ? (
            <ul className="flex flex-col gap-2 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex justify-between gap-3">
                  <span>{e.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(e.starts_at)} · {STATUS_LABELS[e.status]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Sin convocatorias.</Empty>
          )}
        </Card>
      </div>
    </>
  )
}
