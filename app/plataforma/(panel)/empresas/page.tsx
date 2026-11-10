import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, Empty, PageTitle, STATUS_LABELS, StatusBadge, Table, Td } from '@/components/panel/ui'
import { q } from '@/lib/db'
import { formatDate, formatMoney } from '@/lib/dates'
import { requireSuperadmin } from '@/lib/guards'

export const metadata: Metadata = { title: 'Venues' }

const FILTERS = ['trial', 'active', 'past_due', 'paused', 'cancelled']

export default async function ClientsPage({ searchParams }: PageProps<'/plataforma/empresas'>) {
  await requireSuperadmin()
  const { estado } = await searchParams
  const filter = typeof estado === 'string' && FILTERS.includes(estado) ? estado : null
  const rows = await q<{ id: string; name: string; neighborhood: string | null; status: string; plan: string | null; monthly_price_cents: string; currency: string; next_due_date: string | null; events: number; is_demo: boolean }>(
    `SELECT c.id, c.name, c.neighborhood, c.status, p.name AS plan, c.monthly_price_cents::text, c.currency,
            to_char(c.next_due_date, 'YYYY-MM-DD') AS next_due_date, c.is_demo,
            (SELECT count(*)::int FROM gigs g WHERE g.client_id = c.id) AS events
       FROM client c LEFT JOIN plan p ON p.id = c.plan_id
      WHERE ($1::text IS NULL OR c.status = $1)
      ORDER BY c.created_at DESC`,
    [filter],
  )

  return (
    <>
      <PageTitle eyebrow="Plataforma" title="Venues" description="Empresas (bares, teatros, centros culturales) que publican convocatorias en Son.ar." />
      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/plataforma/empresas" className={`rounded-full px-3 py-1.5 font-semibold ${!filter ? 'bg-foreground text-background' : 'border border-border bg-card'}`}>
          Todos
        </Link>
        {FILTERS.map((s) => (
          <Link key={s} href={`/plataforma/empresas?estado=${s}`} className={`rounded-full px-3 py-1.5 font-semibold ${filter === s ? 'bg-foreground text-background' : 'border border-border bg-card'}`}>
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </nav>
      <Card>
        {rows.length ? (
          <Table head={['Venue', 'Plan', 'Abono', 'Próx. vencimiento', 'Convocatorias', 'Estado']}>
            {rows.map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link href={`/plataforma/empresas/${c.id}`} className="font-semibold hover:text-primary">
                    {c.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {c.neighborhood ?? ''}
                    {c.is_demo && ' · demo'}
                  </p>
                </Td>
                <Td>{c.plan ?? '—'}</Td>
                <Td>{formatMoney(c.monthly_price_cents, c.currency)}</Td>
                <Td>{formatDate(c.next_due_date)}</Td>
                <Td>{c.events}</Td>
                <Td>
                  <StatusBadge status={c.status} />
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No hay venues {filter ? 'con ese estado' : 'todavía'}.</Empty>
        )}
      </Card>
    </>
  )
}
