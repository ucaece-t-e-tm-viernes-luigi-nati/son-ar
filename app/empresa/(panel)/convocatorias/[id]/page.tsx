import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BadgeCheck, MapPin } from 'lucide-react'
import { CloseGigButton } from '@/components/business/close-gig-button'
import { Empty, PageTitle, StatusBadge } from '@/components/panel/ui'
import { KindBadge } from '@/components/shared/kind-badge'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { formatARS, formatCompact, formatDate } from '@/lib/format'
import { requireVenue } from '@/lib/guards'
import { gigRepo, profileRepo } from '@/lib/repositories'

export const metadata: Metadata = { title: 'Postulantes' }

export default async function GigApplicantsPage({ params }: PageProps<'/empresa/convocatorias/[id]'>) {
  const ctx = await requireVenue('applicants.view')
  const { id } = await params
  // La convocatoria se busca por id Y por el client_id de la sesión: una ajena da 404.
  const gig = await gigRepo.byId(id, ctx.clientId)
  if (!gig) notFound()
  const applicants = await profileRepo.byIds(gig.applicantIds)
  const order = new Map(gig.applicantIds.map((a, i) => [a, i]))
  applicants.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))

  return (
    <>
      <Link href="/empresa/convocatorias" className="text-xs font-semibold text-muted-foreground hover:text-primary">
        ← Convocatorias
      </Link>
      <PageTitle
        title={gig.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={gig.status} /> {formatDate(gig.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatARS(gig.fee)} · {gig.genres.join(', ')}
          </span>
        }
        actions={gig.status === 'open' && !ctx.readOnly ? <CloseGigButton gigId={gig.id} /> : undefined}
      />
      {gig.description && <p className="mb-6 max-w-3xl text-sm text-muted-foreground">{gig.description}</p>}
      <h2 className="mb-3 text-lg font-semibold">{applicants.length} postulantes</h2>
      {applicants.length === 0 ? (
        <Empty>Todavía nadie se postuló. Las convocatorias abiertas aparecen en la sección Convocatorias de músicos y bandas.</Empty>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {applicants.map((p) => (
            <li key={p.id} className="flex flex-col rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <ProfileAvatar profile={p} className="size-14" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate font-sans text-base font-semibold">{p.name}</h3>
                    {p.verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verificado" />}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" aria-hidden /> {[p.neighborhood, p.city].filter(Boolean).join(', ')} · @{p.handle} · {formatCompact(p.followers)} seguidores
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <KindBadge kind={p.kind} />
                    {p.members ? <span className="text-xs text-muted-foreground">{p.members} integrantes</span> : null}
                    {p.status === 'paused' && <StatusBadge status="paused" label="Cuenta pausada" />}
                  </div>
                </div>
              </div>
              {p.bio && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{p.bio}</p>}
              <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Géneros</dt>
                  <dd className="mt-1">{p.genres.join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Instrumentos</dt>
                  <dd className="mt-1">{p.instruments.join(', ') || '—'}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
