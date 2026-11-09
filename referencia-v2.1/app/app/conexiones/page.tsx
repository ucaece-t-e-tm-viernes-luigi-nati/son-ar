import type { Metadata } from 'next'
import { AcceptButton } from '@/components/app/accept-button'
import { KindBadge } from '@/components/shared/kind-badge'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { getSession } from '@/lib/auth/session'
import { connectionRepo, profileRepo } from '@/lib/repositories'

export const metadata: Metadata = { title: 'Mi red' }

export default async function NetworkPage() {
  const session = await getSession('user')
  const connections = await connectionRepo.forProfile(session.profileId)
  const otherId = (c: (typeof connections)[number]) => (c.fromId === session.profileId ? c.toId : c.fromId)
  const profiles = await profileRepo.byIds(connections.map(otherId))
  const byId = new Map(profiles.map((p) => [p.id, p]))

  const incoming = connections.filter((c) => c.status === 'pending' && c.toId === session.profileId)
  const sent = connections.filter((c) => c.status === 'pending' && c.fromId === session.profileId)
  const accepted = connections.filter((c) => c.status === 'accepted')

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Mi red</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {accepted.length} conexiones · {incoming.length} solicitudes nuevas
        </p>
      </div>

      <section aria-labelledby="incoming-title">
        <h2 id="incoming-title" className="mb-3 text-lg font-semibold">
          Solicitudes
        </h2>
        {incoming.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">No tenés solicitudes pendientes.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
            {incoming.map((c) => {
              const p = byId.get(otherId(c))
              if (!p) return null
              return (
                <li key={c.id} className="flex items-center gap-3 p-4">
                  <ProfileAvatar profile={p} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.bio}</p>
                  </div>
                  <AcceptButton connectionId={c.id} />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="accepted-title">
        <h2 id="accepted-title" className="mb-3 text-lg font-semibold">
          Conexiones
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {[...accepted, ...sent].map((c) => {
            const p = byId.get(otherId(c))
            if (!p) return null
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <ProfileAvatar profile={p} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <KindBadge kind={p.kind} className="mt-1" />
                </div>
                {c.status === 'pending' && <span className="text-xs text-muted-foreground">Pendiente</span>}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
