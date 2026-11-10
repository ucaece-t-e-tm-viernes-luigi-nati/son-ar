import type { Metadata } from 'next'
import { BadgeCheck, MapPin } from 'lucide-react'
import { PostCard } from '@/components/app/post-card'
import { ActionForm, inputClass, labelClass } from '@/components/forms'
import { KindBadge } from '@/components/shared/kind-badge'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { GENRES, INSTRUMENTS, LOOKING_FOR, NEIGHBORHOODS } from '@/lib/domain/types'
import { formatCompact } from '@/lib/format'
import { requireMember } from '@/lib/guards'
import { connectionRepo, postRepo } from '@/lib/repositories'
import { updateProfile } from '../actions'

export const metadata: Metadata = { title: 'Mi perfil' }

const chip =
  'flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:text-accent-foreground'

export default async function ProfilePage({ searchParams }: PageProps<'/app/perfil'>) {
  const { profile: me, canWrite } = await requireMember()
  const sp = await searchParams
  const [posts, connections] = await Promise.all([postRepo.byAuthor(me.id), connectionRepo.forProfile(me.id)])

  const stats = [
    { label: 'Seguidores', value: formatCompact(me.followers) },
    { label: 'Conexiones', value: connections.filter((c) => c.status === 'accepted').length },
    { label: 'Publicaciones', value: posts.length },
  ]

  return (
    <div className="flex flex-col gap-6">
      {sp.bienvenida && (
        <p role="status" className="rounded-2xl border border-primary/30 bg-accent px-4 py-3 text-sm text-accent-foreground">
          ¡Bienvenido/a a Son.ar! Completá tu bio y qué estás buscando para recibir mejores sugerencias.
        </p>
      )}
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
            @{me.handle} · <MapPin className="size-3.5" aria-hidden /> {[me.neighborhood, me.city].filter(Boolean).join(', ')}
          </p>
          {me.bio && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-pretty">{me.bio}</p>}
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

      {canWrite && (
        <details className="rounded-2xl border border-border bg-card p-5" open={!!sp.bienvenida}>
          <summary className="cursor-pointer text-sm font-semibold">Editar mi perfil</summary>
          <ActionForm action={updateProfile} submitLabel="Guardar perfil" className="mt-4 flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                {me.kind === 'band' ? 'Nombre de la banda' : 'Nombre'}
                <input name="name" required maxLength={80} defaultValue={me.name} className={inputClass} />
              </label>
              {me.kind === 'band' && (
                <label className={labelClass}>
                  Integrantes
                  <input name="members" type="number" min={1} max={30} defaultValue={me.members ?? ''} className={inputClass} />
                </label>
              )}
              <label className={labelClass}>
                Ciudad
                <input name="city" required maxLength={60} defaultValue={me.city} className={inputClass} />
              </label>
              <label className={labelClass}>
                Barrio
                <input name="neighborhood" maxLength={60} defaultValue={me.neighborhood} list="barrios-perfil" className={inputClass} />
                <datalist id="barrios-perfil">
                  {NEIGHBORHOODS.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </label>
            </div>
            <label className={labelClass}>
              Bio
              <textarea name="bio" rows={3} maxLength={500} defaultValue={me.bio} className={inputClass} />
            </label>
            {(
              [
                ['genres', 'Géneros', GENRES, me.genres],
                ['instruments', 'Instrumentos', INSTRUMENTS, me.instruments],
                ['lookingFor', 'Qué estás buscando', LOOKING_FOR, me.lookingFor],
              ] as const
            ).map(([name, legend, options, selected]) => (
              <fieldset key={name}>
                <legend className="mb-2 text-sm font-medium">{legend}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {options.map((o) => (
                    <label key={o} className={chip}>
                      <input type="checkbox" name={name} value={o} defaultChecked={(selected as readonly string[]).includes(o)} className="sr-only" /> {o}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </ActionForm>
        </details>
      )}

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
