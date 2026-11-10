import type { Metadata } from 'next'
import { ApplyButton } from '@/components/app/apply-button'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { formatARS, formatDate } from '@/lib/format'
import { requireMember } from '@/lib/guards'
import { gigRepo, profileRepo } from '@/lib/repositories'

export const metadata: Metadata = { title: 'Convocatorias' }

export default async function GigsPage() {
  const { profile: me, canWrite } = await requireMember()
  // Solo convocatorias abiertas, futuras y de venues visibles (empresa no pausada ni dada de baja).
  const gigs = await gigRepo.list({ status: 'open', publicOnly: true, upcoming: true })
  const venues = await profileRepo.byIds([...new Set(gigs.map((g) => g.venueId))])
  const venueById = new Map(venues.map((v) => [v.id, v]))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Convocatorias</h1>
        <p className="mt-1 text-sm text-muted-foreground">Fechas pagas abiertas, publicadas por venues de la ciudad.</p>
      </div>
      {gigs.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">No hay convocatorias abiertas por ahora. Volvé pronto.</p>
      )}
      <ul className="flex flex-col gap-4">
        {gigs.map((gig) => {
          const venue = venueById.get(gig.venueId)
          if (!venue) return null
          return (
            <li key={gig.id} className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 md:flex-row md:items-center">
              <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-accent py-2 text-accent-foreground">
                <span className="text-xs uppercase">{formatDate(gig.date, { month: 'short' })}</span>
                <span className="font-display text-2xl font-semibold leading-none">{formatDate(gig.date, { day: 'numeric' })}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">{gig.title}</h2>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <ProfileAvatar profile={venue} className="size-5" />
                  {venue.name} · {venue.venueType}
                  {venue.capacity ? ` · ${venue.capacity} personas` : ''}
                </div>
                <p className="mt-2 text-sm text-pretty text-muted-foreground">{gig.description}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Géneros">
                  {gig.genres.map((g) => (
                    <li key={g} className="rounded-full border border-border px-2.5 py-0.5 text-xs">
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                <div className="md:text-right">
                  <p className="text-xs text-muted-foreground">Cachet</p>
                  <p className="font-display text-lg font-semibold">{formatARS(gig.fee)}</p>
                </div>
                <ApplyButton gigId={gig.id} applied={gig.applicantIds.includes(me.id)} disabled={!canWrite} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
