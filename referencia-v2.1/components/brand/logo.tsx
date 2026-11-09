import Link from 'next/link'
import { cn } from '@/lib/utils'

export function Logo({ href = '/', className, suffix }: { href?: string; className?: string; suffix?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2 font-display text-lg font-semibold', className)}>
      <span aria-hidden className="flex h-7 items-end gap-0.5">
        <span className="h-2.5 w-1 rounded-full bg-primary" />
        <span className="h-5 w-1 rounded-full bg-primary" />
        <span className="h-7 w-1 rounded-full bg-primary" />
        <span className="h-4 w-1 rounded-full bg-primary/70" />
      </span>
      <span>
        Son<span className="text-primary">AR</span>
      </span>
      {suffix && <span className="ml-1 rounded-md bg-secondary px-1.5 py-0.5 font-sans text-xs font-medium text-muted-foreground">{suffix}</span>}
    </Link>
  )
}
