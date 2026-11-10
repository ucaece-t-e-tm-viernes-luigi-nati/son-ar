import type { Metadata } from 'next'
import Link from 'next/link'
import { AccountsTable, type AccountRow } from '@/components/admin/accounts-table'
import { Card, Empty, PageTitle, Table, Td } from '@/components/panel/ui'
import { q } from '@/lib/db'
import { formatDateTime } from '@/lib/dates'
import type { Profile } from '@/lib/domain/types'
import { requireSuperadmin } from '@/lib/guards'
import { profileRepo } from '@/lib/repositories'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Cuentas' }

const FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'paused', label: 'Pausadas' },
]

export default async function AccountsPage({ searchParams }: PageProps<'/plataforma/cuentas'>) {
  await requireSuperadmin()
  const sp = await searchParams
  const estado = typeof sp.estado === 'string' && ['active', 'paused'].includes(sp.estado) ? sp.estado : 'all'

  const [profiles, emails, history] = await Promise.all([
    profileRepo.list({ includePaused: true }),
    q<{ id: string; email: string }>(`SELECT p.id, u.email FROM profiles p JOIN "user" u ON u.id = p.user_id WHERE p.kind IN ('musician','band')`),
    q<{ id: string; action: string; actor: string | null; detail: { name?: string; from?: string; to?: string } | null; created_at: Date }>(
      `SELECT l.id::text, l.action, u.email AS actor, l.detail, l.created_at
         FROM audit_log l LEFT JOIN "user" u ON u.id = l.actor_user_id
        WHERE l.action IN ('profile.pause','profile.activate') ORDER BY l.created_at DESC LIMIT 15`,
    ),
  ])
  const emailById = new Map(emails.map((e) => [e.id, e.email]))
  const accounts: AccountRow[] = profiles
    .filter((p: Profile) => p.kind === 'musician' || p.kind === 'band')
    .map((p) => ({ ...p, email: emailById.get(p.id) ?? null }))
  const filtered = estado === 'all' ? accounts : accounts.filter((p) => p.status === estado)
  const paused = accounts.filter((p) => p.status === 'paused').length

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        eyebrow="Plataforma"
        title="Cuentas de músicos y bandas"
        description={`${accounts.length} cuentas · ${paused} pausadas. Una cuenta pausada no aparece en la red y no puede publicar, conectar ni postularse.`}
        actions={
          <div className="flex gap-1 rounded-xl bg-secondary p-1" role="group" aria-label="Filtrar por estado">
            {FILTERS.map((f) => (
              <Link
                key={f.value}
                href={f.value === 'all' ? '/plataforma/cuentas' : `/plataforma/cuentas?estado=${f.value}`}
                aria-current={estado === f.value ? 'true' : undefined}
                className={cn('rounded-lg px-3 py-1.5 text-sm text-muted-foreground', estado === f.value && 'bg-background font-medium text-foreground shadow-sm')}
              >
                {f.label}
              </Link>
            ))}
          </div>
        }
      />
      {filtered.length ? <AccountsTable profiles={filtered} /> : <Empty>No hay cuentas con ese estado.</Empty>}
      <Card title="Auditoría de cambios de estado" description="Últimos 15 (el registro completo está en Auditoría).">
        {history.length ? (
          <Table head={['Fecha', 'Acción', 'Cuenta', 'Quién']}>
            {history.map((h) => (
              <tr key={h.id}>
                <Td className="whitespace-nowrap text-xs">{formatDateTime(h.created_at)}</Td>
                <Td>{h.action === 'profile.pause' ? 'Pausada' : 'Activada'}</Td>
                <Td>{h.detail?.name ?? '—'}</Td>
                <Td className="text-xs text-muted-foreground">{h.actor ?? '—'}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>Todavía no se pausó ni activó ninguna cuenta.</Empty>
        )}
      </Card>
    </div>
  )
}
