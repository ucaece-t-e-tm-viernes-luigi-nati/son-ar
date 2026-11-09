import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-6">
        <Logo />
        <nav aria-label="Principal" className="flex items-center gap-1 md:gap-2">
          <Link href="/negocios" className={cn(buttonVariants({ variant: 'ghost' }), 'hidden sm:inline-flex')}>
            Para venues
          </Link>
          <Link href="/admin" className={cn(buttonVariants({ variant: 'ghost' }), 'hidden md:inline-flex')}>
            Admin
          </Link>
          <Link href="/app" className={cn(buttonVariants({ size: 'lg' }), 'px-4')}>
            Entrar a la app
          </Link>
        </nav>
      </div>
    </header>
  )
}
