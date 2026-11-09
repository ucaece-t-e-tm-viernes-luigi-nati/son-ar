import Link from 'next/link'
import { AccountsTable } from '@/components/admin/accounts-table'
import { DailyChart, MonthlyChart } from '@/components/admin/activity-charts'
import { StatCard } from '@/components/panel/panel-shell'
import { formatCompact } from '@/lib/format'
import { profileRepo } from '@/lib/repositories'
import { getDailyActivity, getMonthlyActivity, getOverview } from '@/lib/services/metrics'
import { cn } from '@/lib/utils'

const FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'paused', label: 'Pausadas' },
]

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado = 'all' } = await searchParams
  const overview = getOverview()
  const profiles = await profileRepo.list({ includePaused: true })
  const filtered = estado === 'all' ? profiles : profiles.filter((p) => p.status === estado)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Métricas de la plataforma</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {overview.accounts.total} cuentas · {overview.accounts.musicians} músicos · {overview.accounts.bands} bandas · {overview.accounts.venues} venues
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Usuarios activos hoy" value={formatCompact(overview.today.activeUsers)} delta={overview.today.activeUsersDelta} hint="vs. ayer" />
        <StatCard label="Conexiones hoy" value={overview.today.connections} delta={overview.today.connectionsDelta} hint="vs. ayer" />
        <StatCard label="Registros del mes" value={formatCompact(overview.month.signups)} delta={overview.month.signupsDelta} hint="vs. mes anterior" />
        <StatCard label="Postulaciones del mes" value={formatCompact(overview.month.gigApplications)} delta={overview.month.gigApplicationsDelta} hint="vs. mes anterior" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="daily-title" className="rounded-2xl border border-border bg-card p-5">
          <h2 id="daily-title" className="text-lg font-semibold">Actividad diaria</h2>
          <p className="mb-4 text-sm text-muted-foreground">Últimos 30 días</p>
          <DailyChart data={getDailyActivity(30)} />
        </section>
        <section aria-labelledby="monthly-title" className="rounded-2xl border border-border bg-card p-5">
          <h2 id="monthly-title" className="text-lg font-semibold">Actividad mensual</h2>
          <p className="mb-4 text-sm text-muted-foreground">2026</p>
          <MonthlyChart data={getMonthlyActivity()} />
        </section>
      </div>

      <section aria-labelledby="accounts-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="accounts-title" className="text-lg font-semibold">
            Cuentas <span className="text-sm font-normal text-muted-foreground">({overview.accounts.paused} pausadas)</span>
          </h2>
          <div className="flex gap-1 rounded-xl bg-secondary p-1" role="group" aria-label="Filtrar por estado">
            {FILTERS.map((f) => (
              <Link
                key={f.value}
                href={f.value === 'all' ? '/admin' : `/admin?estado=${f.value}`}
                aria-current={estado === f.value ? 'true' : undefined}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm text-muted-foreground',
                  estado === f.value && 'bg-background font-medium text-foreground shadow-sm',
                )}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>
        <AccountsTable profiles={filtered} />
      </section>
    </div>
  )
}
