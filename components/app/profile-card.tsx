import Link from 'next/link'
import { BadgeCheck, CalendarDays, MapPin } from 'lucide-react'
import { ConnectButton } from '@/components/app/connect-button'
import { KindBadge } from '@/components/shared/kind-badge'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { buttonVariants } from '@/components/ui/button'
import type { ConnectionStatus, Profile } from '@/lib/domain/types'
import { formatCompact } from '@/lib/format'
import { cn } from '@/lib/utils'

export function ProfileCard({ profile, status, canWrite = true }: { profile: Profile; status?: ConnectionStatus; canWrite?: boolean }) {
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <ProfileAvatar profile={profile} className="size-14" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-sans text-base font-semibold">{profile.name}</h3>
            {profile.verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verificado" />}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" aria-hidden /> {[profile.neighborhood, profile.city].filter(Boolean).join(', ')} · {formatCompact(profile.followers)} seguidores
          </p>
          <KindBadge kind={profile.kind} className="mt-2" />
        </div>
      </div>
      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Géneros">
        {profile.genres.map((g) => (
          <li key={g} className="rounded-full border border-border px-2.5 py-0.5 text-xs">
            {g}
          </li>
        ))}
      </ul>
      {profile.kind === 'venue' ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {profile.venueType}
          {profile.capacity ? ` · ${profile.capacity} personas` : ''}
        </p>
      ) : (
        profile.lookingFor.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Busca: <span className="text-accent-foreground">{profile.lookingFor.join(', ')}</span>
          </p>
        )
      )}
      <div className="mt-auto pt-5 [&>button]:w-full">
        {profile.kind === 'venue' ? (
          <Link href="/app/convocatorias" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
            <CalendarDays data-icon="inline-start" /> Ver convocatorias
          </Link>
        ) : (
          <ConnectButton profileId={profile.id} status={status} size="default" disabled={!canWrite} />
        )}
      </div>
    </article>
  )
}
