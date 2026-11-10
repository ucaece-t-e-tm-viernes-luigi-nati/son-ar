import { Guitar, Store, Users } from 'lucide-react'
import { KIND_LABEL, type AccountKind } from '@/lib/domain/types'
import { cn } from '@/lib/utils'

const ICONS = { musician: Guitar, band: Users, venue: Store }

export function KindBadge({ kind, className }: { kind: AccountKind; className?: string }) {
  const Icon = ICONS[kind]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground',
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {KIND_LABEL[kind]}
    </span>
  )
}
