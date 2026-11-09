import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Profile } from '@/lib/domain/types'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

export function ProfileAvatar({
  profile,
  className,
}: {
  profile: Pick<Profile, 'name' | 'avatar' | 'kind'>
  className?: string
}) {
  return (
    <Avatar className={cn('size-10', profile.kind === 'venue' && 'rounded-lg after:rounded-lg', className)}>
      {profile.avatar && <AvatarImage src={profile.avatar} alt={profile.name} className="object-cover" />}
      <AvatarFallback className={cn('bg-accent font-display text-accent-foreground', profile.kind === 'venue' && 'rounded-lg')}>
        {initials(profile.name)}
      </AvatarFallback>
    </Avatar>
  )
}
