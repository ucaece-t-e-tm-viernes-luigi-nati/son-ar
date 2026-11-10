import type { Metadata } from 'next'
import Link from 'next/link'
import { CloseGigButton } from '@/components/business/close-gig-button'
import { GigForm } from '@/components/business/gig-form'
import { Card, Empty, PageTitle, StatusBadge } from '@/components/panel/ui'
import { KindBadge } from '@/components/shared/kind-badge'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { dayKeyAR } from '@/lib/dates'
import { formatARS, formatDate } from '@/lib/format'
import { requireVenue } from '@/lib/guards'
import { venueCan } from '@/lib/permissions'
import { gigRepo, profileRepo } from '@/lib/repositories'

export const metadata: Metadata = { title: 'Convocatorias' }

export default async function VenueGigsPage() {
  const ctx = await requireVenue('gigs.manage')
  // Multi-tenant: solo las convocatorias de la empresa de la sesión.
  const gigs = await gigRepo.list({ clientId: ctx.clientId })
  const applicants = await profileRepo.byIds([...new Set(gigs.flatMap((g) => g.applicantIds))])
  const applicantById = new Map(applicants.map((a) => [a.id, a]))
  const canSeeApplicants = venueCan(ctx.role, 'applicants.view')

  return (
    <>
      <PageTitle eyebrow={ctx.clientName} title="Convocatorias" description="Fechas pagas que publicás para músicos y bandas. Cerralas cuando ya elegiste." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-label="Mis convocatorias" className="flex flex-col gap-4">
          {gigs.length === 0 && <Empty>Publicá tu primera fecha para empezar a recibir propuestas.</Empty>}
          {[...gigs].reverse().map((gig) => (
            <article key={gig.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-sans text-base font-semibold">
                    <Link href={`/empresa/convocatorias/${gig.id}`} className="hover:text-primary">
                      {gig.title}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(gig.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatARS(gig.fee)} · {gig.genres.join(', ')}
                  </p>
                </div>
                {gig.status === 'open' && !ctx.readOnly ? <CloseGigButton gigId={gig.id} /> : <StatusBadge status={gig.status} />}
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{gig.applicantIds.length} postulaciones</p>
                  {canSeeApplicants && gig.applicantIds.length > 0 && (
                    <Link href={`/empresa/convocatorias/${gig.id}`} className="text-xs font-semibold text-primary hover:underline">
                      Ver postulantes con su perfil →
                    </Link>
                  )}
                </div>
                {canSeeApplicants && (
                  <ul className="flex flex-col gap-3">
                    {gig.applicantIds.slice(0, 4).map((id) => {
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
                )}
              </div>
            </article>
          ))}
        </section>
        <div>
          <GigForm minDate={dayKeyAR()} disabled={ctx.readOnly} />
        </div>
      </div>
    </>
  )
}
