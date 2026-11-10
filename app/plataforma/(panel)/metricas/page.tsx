import type { Metadata } from 'next'
import { DailyChart, MonthlyChart } from '@/components/admin/activity-charts'
import { PageTitle, StatCard } from '@/components/panel/ui'
import { formatCompact } from '@/lib/format'
import { requireSuperadmin } from '@/lib/guards'
import { getDailyActivity, getMonthlyActivity, getOverview } from '@/lib/services/metrics'

export const metadata: Metadata = { title: 'Métricas' }

export default async function MetricsPage() {
  await requireSuperadmin()
  const [overview, daily, monthly] = await Promise.all([getOverview(), getDailyActivity(30), getMonthlyActivity(6)])

  return (
    <div className="flex flex-col gap-8">
      <PageTitle
        eyebrow="Plataforma"
        title="Métricas de la red"
        description={`${overview.accounts.total} perfiles · ${overview.accounts.musicians} músicos · ${overview.accounts.bands} bandas · ${overview.accounts.venues} venues · datos de activity_events`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Usuarios activos hoy" value={formatCompact(overview.today.activeUsers)} delta={overview.today.activeUsersDelta} hint="vs. ayer" />
        <StatCard label="Conexiones hoy" value={overview.today.connections} delta={overview.today.connectionsDelta} hint="vs. ayer" />
        <StatCard label="Registros del mes" value={formatCompact(overview.month.signups)} delta={overview.month.signupsDelta} hint="vs. mes anterior" />
        <StatCard label="Postulaciones del mes" value={formatCompact(overview.month.gigApplications)} delta={overview.month.gigApplicationsDelta} hint="vs. mes anterior" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="daily-title" className="rounded-2xl border border-border bg-card p-5">
          <h2 id="daily-title" className="text-lg font-semibold">
            Actividad diaria
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">Últimos 30 días</p>
          <DailyChart data={daily} />
        </section>
        <section aria-labelledby="monthly-title" className="rounded-2xl border border-border bg-card p-5">
          <h2 id="monthly-title" className="text-lg font-semibold">
            Actividad mensual
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">Últimos 6 meses</p>
          <MonthlyChart data={monthly} />
        </section>
      </div>
    </div>
  )
}
