import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BadgeCheck, MapPin } from 'lucide-react'
import { PostCard } from '@/components/app/post-card'
import { KindBadge } from '@/components/shared/kind-badge'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { getSession } from '@/lib/auth/session'
import { formatCompact } from '@/lib/format'
import { connectionRepo, postRepo, profileRepo } from '@/lib/repositories'

export const metadata: Metadata = { title: 'Mi perfil' }

export default async function ProfilePage() {
  const session = await getSession('user')
  const [me, posts, connections] = await Promise.all([
    profileRepo.byId(session.profileId),
    postRepo.byAuthor(session.profileId),
    connectionRepo.forProfile(session.profileId),
  ])
  if (!me) notFound()

  const stats = [
    { label: 'Seguidores', value: formatCompact(me.followers) },
    { label: 'Conexiones', value: connections.filter((c) => c.status === 'accepted').length },
    { label: 'Publicaciones', value: posts.length },
  ]

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div aria-hidden className="h-28 bg-gradient-to-r from-accent via-primary/40 to-accent md:h-36" />
        <div className="px-5 pb-6">
          <ProfileAvatar profile={me} className="-mt-12 size-24 ring-4 ring-card" />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{me.name}</h1>
            {me.verified && <BadgeCheck className="size-5 text-primary" aria-label="Verificado" />}
            <KindBadge kind={me.kind} />
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            @{me.handle} · <MapPin className="size-3.5" aria-hidden /> {me.neighborhood}, {me.city}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-pretty">{me.bio}</p>
          <dl className="mt-5 flex gap-8">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className="font-display text-xl font-semibold">{s.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
            {[
              { title: 'Instrumentos', items: me.instruments },
              { title: 'Géneros', items: me.genres },
              { title: 'Busco', items: me.lookingFor },
            ].map((group) => (
              <div key={group.title}>
                <h2 className="font-sans text-xs font-medium text-muted-foreground">{group.title}</h2>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {group.items.map((i) => (
                    <li key={i} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
      <h2 className="text-lg font-semibold">Publicaciones</h2>
      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Todavía no publicaste nada. Contale a la escena qué estás buscando desde Inicio.
        </p>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} author={me} />)
      )}
    </div>
  )
}
