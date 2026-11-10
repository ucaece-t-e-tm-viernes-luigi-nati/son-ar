import type { Profile } from '@/lib/domain/types'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Avatar del perfil (imagen o iniciales). Los venues usan esquinas redondeadas en vez de círculo. */
export function ProfileAvatar({ profile, className }: { profile: Pick<Profile, 'name' | 'avatar' | 'kind'>; className?: string }) {
  const shape = profile.kind === 'venue' ? 'rounded-lg' : 'rounded-full'
  return (
    <span className={cn('relative flex size-10 shrink-0 overflow-hidden border border-border select-none', shape, className)}>
      {profile.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar} alt={profile.name} loading="lazy" className="size-full object-cover" />
      ) : (
        <span aria-label={profile.name} className="flex size-full items-center justify-center bg-accent font-display text-sm text-accent-foreground">
          {initials(profile.name)}
        </span>
      )}
    </span>
  )
}
