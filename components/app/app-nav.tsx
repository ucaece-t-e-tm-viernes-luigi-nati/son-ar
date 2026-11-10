'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Compass, Home, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/app', label: 'Inicio', icon: Home },
  { href: '/app/explorar', label: 'Explorar', icon: Compass },
  { href: '/app/convocatorias', label: 'Fechas', icon: CalendarDays },
  { href: '/app/conexiones', label: 'Red', icon: Users },
  { href: '/app/perfil', label: 'Perfil', icon: User },
]

function useIsActive() {
  const pathname = usePathname()
  return (href: string) => (href === '/app' ? pathname === href : pathname.startsWith(href))
}

export function SideNav({ pendingCount }: { pendingCount: number }) {
  const isActive = useIsActive()
  return (
    <nav aria-label="App" className="flex flex-col gap-1">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? 'page' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
            isActive(item.href) && 'bg-secondary text-foreground',
          )}
        >
          <item.icon className={cn('size-5', isActive(item.href) && 'text-primary')} aria-hidden />
          {item.label}
          {item.href === '/app/conexiones' && pendingCount > 0 && (
            <span className="ml-auto rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
              {pendingCount}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}

export function BottomNav({ pendingCount }: { pendingCount: number }) {
  const isActive = useIsActive()
  return (
    <nav
      aria-label="App"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
    >
      <ul className="flex justify-around">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center gap-1 px-3 py-2.5 text-[11px] font-medium text-muted-foreground',
                isActive(item.href) && 'text-foreground',
              )}
            >
              <item.icon className={cn('size-5', isActive(item.href) && 'text-primary')} aria-hidden />
              {item.label}
              {item.href === '/app/conexiones' && pendingCount > 0 && (
                <span className="absolute right-2 top-1.5 size-2 rounded-full bg-primary">
                  <span className="sr-only">{pendingCount} solicitudes pendientes</span>
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
