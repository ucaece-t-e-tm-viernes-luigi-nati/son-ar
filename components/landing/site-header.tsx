import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Header público: solo lleva a la superficie de músicos y bandas. Nunca linkea a los paneles internos.
export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-6">
        <Logo />
        <nav aria-label="Principal" className="flex items-center gap-1 md:gap-2">
          <Link href="/ingresar" className={cn(buttonVariants({ variant: 'ghost' }), 'hidden sm:inline-flex')}>
            Ingresar
          </Link>
          <Link href="/ingresar?modo=registro" className={cn(buttonVariants({ size: 'lg' }), 'px-4')}>
            Crear mi perfil
          </Link>
        </nav>
      </div>
    </header>
  )
}
