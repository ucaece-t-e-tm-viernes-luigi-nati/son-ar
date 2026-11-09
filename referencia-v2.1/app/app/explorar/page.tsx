import type { Metadata } from 'next'
import { ExploreFilters } from '@/components/app/explore-filters'
import { ProfileCard } from '@/components/app/profile-card'
import { getSession } from '@/lib/auth/session'
import type { AccountKind } from '@/lib/domain/types'
import { connectionRepo, profileRepo } from '@/lib/repositories'

export const metadata: Metadata = { title: 'Explorar' }

const KINDS: AccountKind[] = ['musician', 'band', 'venue']

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; genre?: string }>
}) {
  const { q, kind, genre } = await searchParams
  const session = await getSession('user')
  const validKind = KINDS.includes(kind as AccountKind) ? (kind as AccountKind) : undefined
  const [profiles, genres, connections] = await Promise.all([
    profileRepo.list({ q, kind: validKind, genre }),
    profileRepo.allGenres(),
    connectionRepo.forProfile(session.profileId),
  ])
  const statusFor = (id: string) =>
    connections.find((c) => c.fromId === id || c.toId === id)?.status
  const results = profiles.filter((p) => p.id !== session.profileId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Explorar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Músicos, bandas y venues de Mar del Plata.</p>
      </div>
      <ExploreFilters q={q} kind={validKind} genre={genre} genres={genres} />
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
      </p>
      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No encontramos perfiles con esos filtros.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((p) => (
            <ProfileCard key={p.id} profile={p} status={statusFor(p.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
