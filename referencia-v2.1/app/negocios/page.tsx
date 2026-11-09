import { CloseGigButton } from '@/components/business/close-gig-button'
import { GigForm } from '@/components/business/gig-form'
import { StatCard } from '@/components/panel/panel-shell'
import { KindBadge } from '@/components/shared/kind-badge'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { getSession } from '@/lib/auth/session'
import { formatARS, formatDate } from '@/lib/format'
import { gigRepo, profileRepo } from '@/lib/repositories'
import { getMatchesFor } from '@/lib/services/matching'

export default async function BusinessPage() {
  const session = await getSession('business')
  const [venue, gigs, suggestions] = await Promise.all([
    profileRepo.byId(session.profileId),
    gigRepo.list({ venueId: session.profileId }),
    getMatchesFor(session.profileId, 4),
  ])
  const applicants = await profileRepo.byIds([...new Set(gigs.flatMap((g) => g.applicantIds))])
  const applicantById = new Map(applicants.map((a) => [a.id, a]))
  const open = gigs.filter((g) => g.status === 'open')
  const totalApplicants = gigs.reduce((n, g) => n + g.applicantIds.length, 0)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{venue?.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {venue?.venueType} · {venue?.neighborhood} · Capacidad {venue?.capacity}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Convocatorias abiertas" value={open.length} hint={`${gigs.length} en total`} />
        <StatCard label="Postulaciones recibidas" value={totalApplicants} hint="Bandas y solistas" />
        <StatCard label="Seguidores del venue" value={venue?.followers ?? 0} hint="En SonAR" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="gigs-title" className="flex flex-col gap-4">
          <h2 id="gigs-title" className="text-lg font-semibold">Mis convocatorias</h2>
          {gigs.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Publicá tu primera fecha para empezar a recibir propuestas.
            </p>
          )}
          {gigs.map((gig) => (
            <article key={gig.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-sans text-base font-semibold">{gig.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(gig.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatARS(gig.fee)} · {gig.genres.join(', ')}
                  </p>
                </div>
                {gig.status === 'open' ? (
                  <CloseGigButton gigId={gig.id} />
                ) : (
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">Cerrada</span>
                )}
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-3 text-xs font-medium text-muted-foreground">{gig.applicantIds.length} postulaciones</p>
                <ul className="flex flex-col gap-3">
                  {gig.applicantIds.map((id) => {
                    const a = applicantById.get(id)
                    if (!a) return null
                    return (
                      <li key={id} className="flex items-center gap-3">
                        <ProfileAvatar profile={a} className="size-8" />
                        <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
                        <KindBadge kind={a.kind} />
                      </li>
                    )
                  })}
                </ul>
              </div>
            </article>
          ))}
        </section>

        <div className="flex flex-col gap-6">
          <GigForm />
          <section aria-labelledby="suggest-title" className="rounded-2xl border border-border bg-card p-5">
            <h2 id="suggest-title" className="text-lg font-semibold">Artistas sugeridos</h2>
            <ul className="mt-4 flex flex-col gap-3">
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
          </section>
        </div>
      </div>
    </div>
  )
}
