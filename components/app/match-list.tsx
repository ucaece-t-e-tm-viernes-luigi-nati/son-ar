import Link from 'next/link'
import { ConnectButton } from '@/components/app/connect-button'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { KIND_LABEL, type Match } from '@/lib/domain/types'

export function MatchList({ matches }: { matches: Match[] }) {
  return (
    <section aria-labelledby="matches-title" className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="matches-title" className="text-base font-semibold">
          Tu sintonía
        </h2>
        <span className="text-xs text-muted-foreground">Según tus géneros y búsquedas</span>
      </div>
      {matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ya conectaste con todas tus sugerencias.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {matches.map((m) => (
            <li key={m.profile.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <ProfileAvatar profile={m.profile} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.profile.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {KIND_LABEL[m.profile.kind]} · {m.reasons[0] ?? m.profile.genres[0]}
                  </p>
                </div>
                <span className="font-display text-sm font-semibold text-primary" aria-label={`${m.score}% de afinidad`}>
                  {m.score}%
                </span>
              </div>
              {m.profile.kind === 'venue' ? (
                <Link href="/app/convocatorias" className="text-center text-xs font-medium text-primary hover:underline">
                  Ver sus convocatorias
                </Link>
              ) : (
                <ConnectButton profileId={m.profile.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
