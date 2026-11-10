import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Card, Empty, Metric, PageTitle, StatusBadge } from '@/components/panel/ui'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { getVenueMetrics } from '@/lib/data/venue'
import { formatARS, formatDate } from '@/lib/format'
import { requireVenue } from '@/lib/guards'
import { gigRepo, profileRepo } from '@/lib/repositories'
import { getMatchesFor } from '@/lib/services/matching'

export default async function VenueDashboard() {
  const ctx = await requireVenue('dashboard.view')
  const [metrics, gigs, venue] = await Promise.all([getVenueMetrics(ctx.clientId), gigRepo.list({ clientId: ctx.clientId }), profileRepo.byClientId(ctx.clientId)])
  const suggestions = venue ? (await getMatchesFor(venue.id, 6)).filter((m) => m.profile.kind !== 'venue').slice(0, 4) : []
  const recent = [...gigs].reverse().slice(0, 5)

  return (
    <>
      <PageTitle
        eyebrow="Panel del venue"
        title={`Hola, ${ctx.user.name.split(' ')[0]}`}
        description={venue ? `${venue.venueType ?? 'Venue'} · ${[venue.neighborhood, venue.city].filter(Boolean).join(', ')}${venue.capacity ? ` · Capacidad ${venue.capacity}` : ''}` : ctx.clientName}
        actions={
          !ctx.readOnly && (
            <Link href="/empresa/convocatorias" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
              <Plus className="size-4" aria-hidden="true" /> Nueva convocatoria
            </Link>
          )
        }
      />
      <section aria-label="Métricas" className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Convocatorias abiertas" value={metrics.open} hint={`${metrics.total} en total`} />
        <Metric label="Próximas abiertas" value={metrics.upcoming} hint="Visibles hoy para músicos y bandas" />
        <Metric label="Postulaciones recibidas" value={metrics.applicants} hint="Bandas y solistas" />
        <Metric label="Seguidores del venue" value={venue?.followers ?? 0} hint="En Son.ar" />
      </section>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card title="Últimas convocatorias">
          {recent.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {recent.map((gig) => (
                <li key={gig.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/empresa/convocatorias/${gig.id}`} className="block truncate text-sm font-semibold hover:text-primary">
                      {gig.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(gig.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {formatARS(gig.fee)} · {gig.applicantIds.length} postulaciones
                    </p>
                  </div>
                  <StatusBadge status={gig.status} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Publicá tu primera fecha para empezar a recibir propuestas.</Empty>
          )}
        </Card>
        <Card title="Artistas sugeridos" description="Según los géneros que programás.">
          {suggestions.length ? (
            <ul className="flex flex-col gap-3">
              {suggestions.map((m) => (
                <li key={m.profile.id} className="flex items-center gap-3">
                  <ProfileAvatar profile={m.profile} className="size-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.profile.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.profile.genres.join(', ')}</p>
                  </div>
                  <span className="font-display text-sm font-semibold text-primary">{m.score}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Todavía no hay sugerencias para tu venue.</Empty>
          )}
        </Card>
      </div>
    </>
  )
}
